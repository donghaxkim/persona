import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;
  const { runId } = await params;

  const { data: run, error } = await supabase
    .from("pipeline_runs")
    .select("*, generation_jobs(*)")
    .eq("id", runId)
    .single();

  if (error || !run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Find the active job (most recent non-completed for current step)
  const activeJob = (run.generation_jobs || [])
    .filter((j: any) => j.step === run.current_step && (j.status === "pending" || j.status === "processing"))
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;

  return NextResponse.json({
    runId: run.id,
    influencerId: run.influencer_id,
    videoId: run.video_id,
    status: run.status,
    currentStep: run.current_step,
    stepData: run.step_data,
    activeJob: activeJob ? {
      id: activeJob.id,
      step: activeJob.step,
      status: activeJob.status,
      estimatedCompletion: activeJob.estimated_completion,
      error: activeJob.error_message,
      output: activeJob.output_data,
    } : null,
    createdAt: run.created_at,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;
  const { runId } = await params;

  const { error } = await supabase
    .from("pipeline_runs")
    .update({ status: "abandoned", completed_at: new Date().toISOString() })
    .eq("id", runId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
