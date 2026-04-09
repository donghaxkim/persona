import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const { influencerId, prompt, template, duration, resolution } = await request.json();

  // Verify ownership
  const { data: inf } = await supabase.from("influencers").select("id").eq("id", influencerId).single();
  if (!inf) return NextResponse.json({ error: "Influencer not found" }, { status: 404 });

  // Rate limit: 1 active run per user
  const { count } = await supabase
    .from("pipeline_runs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .eq("status", "active");

  if ((count || 0) > 0) {
    return NextResponse.json({ error: "You already have an active pipeline run" }, { status: 429 });
  }

  // Create video record first
  const { data: video, error: vidErr } = await supabase
    .from("videos")
    .insert({
      influencer_id: influencerId,
      prompt: prompt || "",
      template: template || "freeform",
      duration: duration || 10,
      resolution: resolution || "1080p",
      status: "pending",
    })
    .select()
    .single();

  if (vidErr) return NextResponse.json({ error: vidErr.message }, { status: 500 });

  // Create pipeline run
  const { data: run, error: runErr } = await supabase
    .from("pipeline_runs")
    .insert({
      user_id: user!.id,
      influencer_id: influencerId,
      video_id: video.id,
      current_step: 1,
      status: "active",
      step_data: {},
    })
    .select()
    .single();

  if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 });

  return NextResponse.json({ runId: run.id, videoId: video.id }, { status: 201 });
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const { searchParams } = new URL(request.url);
  const influencerId = searchParams.get("influencerId");
  const status = searchParams.get("status") || "active";

  let query = supabase
    .from("pipeline_runs")
    .select("*, generation_jobs(*)")
    .eq("user_id", user!.id)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (influencerId) query = query.eq("influencer_id", influencerId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
