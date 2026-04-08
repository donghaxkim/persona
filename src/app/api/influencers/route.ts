import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from("influencers")
    .select(`
      *,
      reference_images(id, thumbnail_path, angle, expression, framing, status),
      videos(id, prompt, template, duration, resolution, status, thumbnail_path, consistency_score, created_at)
    `)
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json();
  const { name, niche } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const hues = [340, 210, 140, 30, 270, 180];
  const hue = hues[Math.floor(Math.random() * hues.length)];

  const { data, error } = await supabase
    .from("influencers")
    .insert({
      user_id: user!.id,
      name: name.trim(),
      niche: (niche || "General").trim(),
      avatar_gradient: `linear-gradient(135deg, hsl(${hue}, 40%, 70%) 0%, hsl(${hue + 30}, 50%, 60%) 100%)`,
      avatar_initial: name.trim().charAt(0).toUpperCase(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
