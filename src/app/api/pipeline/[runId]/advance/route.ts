import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";
import { generateFace, generatePoseGrid, generateComposite, animateComposite } from "@/lib/kie";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;
  const { runId } = await params;

  const body = await request.json();

  // Get pipeline run
  const { data: run } = await supabase
    .from("pipeline_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (!run) return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  if (run.status !== "active") return NextResponse.json({ error: "Pipeline is not active" }, { status: 400 });

  const step = run.current_step;
  const stepData = run.step_data || {};

  try {
    let jobData: any = null;
    let estimatedMs = 5000;

    if (step === 1) {
      // Generate face from prompt + optional reference image
      const result = await generateFace(body.prompt, body.referenceImageUrl);
      jobData = { imageUrl: result.imageUrl, taskId: result.taskId };

    } else if (step === 2) {
      // Generate pose grid from selected face
      const faceUrl = stepData["1"]?.imageUrl;
      if (!faceUrl) return NextResponse.json({ error: "Step 1 not completed" }, { status: 400 });
      const result = await generatePoseGrid(faceUrl, body.prompt || "multi-angle reference sheet");
      jobData = { imageUrl: result.imageUrl, taskId: result.taskId };

    } else if (step === 3) {
      // Motion reference — client provides video URL (upload handled separately)
      // Just store it and advance
      const newStepData = { ...stepData, "3": { videoUrl: body.videoUrl, duration: body.duration || 10 } };
      await supabase
        .from("pipeline_runs")
        .update({ step_data: newStepData, current_step: 4 })
        .eq("id", runId);

      return NextResponse.json({ stepped: true, currentStep: 4 });

    } else if (step === 4) {
      // Composite: face on keyframe
      const faceUrl = stepData["1"]?.imageUrl;
      const videoUrl = stepData["3"]?.videoUrl;
      if (!faceUrl || !videoUrl) return NextResponse.json({ error: "Previous steps not completed" }, { status: 400 });
      const result = await generateComposite(faceUrl, videoUrl, body.prompt || "face swap composite");
      jobData = { imageUrl: result.imageUrl, taskId: result.taskId };

    } else if (step === 5) {
      // Animate composite into video
      const compositeUrl = stepData["4"]?.imageUrl;
      if (!compositeUrl) return NextResponse.json({ error: "Step 4 not completed" }, { status: 400 });
      const result = await animateComposite(compositeUrl, body.prompt || "smooth cinematic motion", body.duration || "5");
      jobData = { taskId: result.taskId };
      estimatedMs = 45000; // Video generation takes longer

    } else {
      return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    // For Flux Kontext (steps 1, 2, 4) — result is synchronous
    // Store result directly in step_data and advance
    if (step !== 5 && jobData?.imageUrl) {
      const newStepData = { ...stepData, [String(step)]: jobData };
      await supabase
        .from("pipeline_runs")
        .update({ step_data: newStepData, current_step: step + 1 })
        .eq("id", runId);

      // Create a completed job record for history
      await supabase.from("generation_jobs").insert({
        pipeline_run_id: runId,
        step,
        status: "completed",
        kie_task_id: jobData.taskId,
        output_data: jobData,
        completed_at: new Date().toISOString(),
      });

      return NextResponse.json({ stepped: true, currentStep: step + 1, output: jobData });
    }

    // For async tasks (step 5) — create pending job, wait for webhook
    const { data: job, error: jobErr } = await supabase
      .from("generation_jobs")
      .insert({
        pipeline_run_id: runId,
        step,
        status: "processing",
        kie_task_id: jobData?.taskId,
        input_data: body,
        estimated_completion: new Date(Date.now() + estimatedMs).toISOString(),
      })
      .select()
      .single();

    if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 });

    return NextResponse.json({
      stepped: false,
      jobId: job.id,
      estimatedCompletion: job.estimated_completion,
    });

  } catch (err: any) {
    // Kie.ai call failed
    await supabase.from("generation_jobs").insert({
      pipeline_run_id: runId,
      step,
      status: "failed",
      error_message: err.message,
    });

    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
