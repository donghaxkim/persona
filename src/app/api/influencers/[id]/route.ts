import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;
  const { id } = await params;

  const body = await request.json();
  const patch: Record<string, string> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.niche !== undefined) patch.niche = body.niche.trim();

  const { data, error } = await supabase
    .from("influencers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;
  const { id } = await params;

  // 1. Collect storage paths BEFORE cascade delete
  const { data: refs } = await supabase
    .from("reference_images")
    .select("storage_path, thumbnail_path")
    .eq("influencer_id", id);

  const { data: vids } = await supabase
    .from("videos")
    .select("storage_path, thumbnail_path")
    .eq("influencer_id", id);

  // 2. Delete influencer (cascades to refs, videos, pipeline_runs, jobs)
  const { error } = await supabase
    .from("influencers")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 3. Clean up storage (fire-and-forget)
  const paths = [
    ...(refs || []).flatMap((r) => [r.storage_path, r.thumbnail_path]),
    ...(vids || []).flatMap((v) => [v.storage_path, v.thumbnail_path]),
  ].filter(Boolean);

  if (paths.length > 0) {
    const refPaths = paths.filter((p) => p.startsWith("references/")).map((p) => p.replace("references/", ""));
    const vidPaths = paths.filter((p) => p.startsWith("videos/")).map((p) => p.replace("videos/", ""));
    if (refPaths.length) supabase.storage.from("references").remove(refPaths);
    if (vidPaths.length) supabase.storage.from("videos").remove(vidPaths);
  }

  return NextResponse.json({ success: true });
}
