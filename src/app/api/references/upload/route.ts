import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";
import sharp from "sharp";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const influencerId = formData.get("influencerId") as string;

  if (!file || !influencerId) {
    return NextResponse.json({ error: "File and influencerId required" }, { status: 400 });
  }

  // Verify ownership (RLS handles this but explicit check for clear errors)
  const { data: influencer } = await supabase
    .from("influencers")
    .select("id")
    .eq("id", influencerId)
    .single();

  if (!influencer) {
    return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
  }

  // Check limit
  const { count } = await supabase
    .from("reference_images")
    .select("*", { count: "exact", head: true })
    .eq("influencer_id", influencerId);

  if ((count || 0) >= 30) {
    return NextResponse.json({ error: "Maximum 30 reference images" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageId = crypto.randomUUID();

  // Resize with sharp
  const medium = await sharp(buffer)
    .resize(800, null, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const thumbnail = await sharp(buffer)
    .resize(200, null, { withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();

  // Upload to Supabase Storage
  const mediumPath = `${influencerId}/${imageId}/medium.jpg`;
  const thumbPath = `${influencerId}/${imageId}/thumb.jpg`;

  const [medUpload, thumbUpload] = await Promise.all([
    supabase.storage.from("references").upload(mediumPath, medium, { contentType: "image/jpeg" }),
    supabase.storage.from("references").upload(thumbPath, thumbnail, { contentType: "image/jpeg" }),
  ]);

  if (medUpload.error || thumbUpload.error) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Classify (mock — deterministic based on imageId hash)
  const classification = classifyImage(imageId);

  // Insert record
  const { data: record, error } = await supabase
    .from("reference_images")
    .insert({
      influencer_id: influencerId,
      storage_path: `references/${mediumPath}`,
      thumbnail_path: `references/${thumbPath}`,
      angle: classification.angle,
      expression: classification.expression,
      framing: classification.framing,
      status: classification.quality >= 0.5 ? "accepted" : "rejected",
      rejection_reason: classification.quality < 0.5 ? "Low image quality" : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate signed URL for thumbnail
  const { data: signedUrl } = await supabase.storage
    .from("references")
    .createSignedUrl(thumbPath, 3600);

  return NextResponse.json({
    ...record,
    thumbnailUrl: signedUrl?.signedUrl || null,
  }, { status: 201 });
}

function classifyImage(imageId: string) {
  const angles = ["front", "three-quarter", "side", "back"] as const;
  const expressions = ["neutral", "smile", "serious"] as const;
  const framings = ["close-up", "mid-shot", "full-body"] as const;

  const hash = imageId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    angle: angles[hash % angles.length],
    expression: expressions[hash % expressions.length],
    framing: framings[hash % framings.length],
    quality: 0.8 + (hash % 20) / 100,
  };
}
