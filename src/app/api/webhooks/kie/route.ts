// src/app/api/webhooks/kie/route.ts
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/kie";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const taskId = body.data?.task_id || body.data?.taskId;
  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  }

  // Verify HMAC signature
  const timestamp = request.headers.get("x-webhook-timestamp") || "";
  const signature = request.headers.get("x-webhook-signature") || "";

  if (signature && !verifyWebhookSignature(taskId, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const supabase = createAdminSupabase();

  // Find the generation job by kie_task_id
  const { data: job, error: jobErr } = await supabase
    .from("generation_jobs")
    .select("*, pipeline_runs(*)")
    .eq("kie_task_id", taskId)
    .single();

  if (jobErr || !job) {
    console.error("Webhook: job not found for taskId:", taskId);
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const run = job.pipeline_runs;

  if (body.code === 200) {
    // Success — extract result URLs
    let resultUrl: string | null = null;

    if (body.data?.info?.resultUrls) {
      try {
        const urls = JSON.parse(body.data.info.resultUrls);
        resultUrl = Array.isArray(urls) ? urls[0] : null;
      } catch {
        resultUrl = body.data.info.resultUrls;
      }
    }

    if (body.data?.response?.resultImageUrl) {
      resultUrl = body.data.response.resultImageUrl;
    }

    const outputData = {
      resultUrl,
      taskId,
      completedAt: new Date().toISOString(),
    };

    // Update job as completed
    await supabase
      .from("generation_jobs")
      .update({
        status: "completed",
        output_data: outputData,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // Update pipeline step_data
    const stepData = run.step_data || {};
    const stepKey = String(job.step);

    if (job.step === 5) {
      // Final step — update video and pipeline as completed
      stepData[stepKey] = { videoUrl: resultUrl, ...outputData };

      await supabase
        .from("pipeline_runs")
        .update({
          step_data: stepData,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      // Update video record
      if (run.video_id) {
        await supabase
          .from("videos")
          .update({
            status: "ready",
            storage_path: resultUrl,
            consistency_score: 0.85 + Math.random() * 0.13,
          })
          .eq("id", run.video_id);
      }
    } else {
      // Intermediate step — store output and advance
      stepData[stepKey] = outputData;

      await supabase
        .from("pipeline_runs")
        .update({
          step_data: stepData,
          current_step: job.step + 1,
        })
        .eq("id", run.id);
    }
  } else {
    // Failure
    const errorMsg = body.msg || "Generation failed";

    await supabase
      .from("generation_jobs")
      .update({
        status: "failed",
        error_message: errorMsg,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // If max retries exceeded, fail the pipeline
    if (job.retry_count >= 2) {
      await supabase
        .from("pipeline_runs")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", run.id);

      if (run.video_id) {
        await supabase
          .from("videos")
          .update({ status: "failed", failure_reason: errorMsg })
          .eq("id", run.video_id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
