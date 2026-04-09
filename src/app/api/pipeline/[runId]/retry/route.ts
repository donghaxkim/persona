import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;
  const { runId } = await params;

  // Find the latest failed job for this run
  const { data: jobs } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("pipeline_run_id", runId)
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(1);

  const failedJob = jobs?.[0];
  if (!failedJob) return NextResponse.json({ error: "No failed job to retry" }, { status: 400 });
  if (failedJob.retry_count >= 3) return NextResponse.json({ error: "Max retries exceeded" }, { status: 400 });

  // Increment retry count
  await supabase
    .from("generation_jobs")
    .update({ retry_count: failedJob.retry_count + 1, status: "pending" })
    .eq("id", failedJob.id);

  return NextResponse.json({ retrying: true, jobId: failedJob.id, retryCount: failedJob.retry_count + 1 });
}
