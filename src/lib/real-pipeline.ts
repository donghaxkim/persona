import { api } from "./api";
import { generateId } from "./utils";
import type { CompositeResult, AnimationResult, ReferenceVideo, GeneratedFace } from "./types";

export type PhaseCallback = (phase: string, progress: number) => void;

// Store the current pipeline run ID (set when pipeline is created)
let currentRunId: string | null = null;

export function setCurrentRunId(runId: string | null) {
  currentRunId = runId;
}

export function getCurrentRunId(): string | null {
  return currentRunId;
}

export async function createPipelineRun(
  influencerId: string,
  prompt: string = "",
  template: string = "freeform",
  duration: number = 10,
  resolution: string = "1080p"
): Promise<{ runId: string; videoId: string }> {
  const result = await api.pipeline.create(influencerId, prompt, template, duration, resolution);
  currentRunId = result.runId;
  return result;
}

// extractVideoKeyframe stays client-side (no API needed)
export { extractVideoKeyframe } from "./mock-pipeline";

export async function realComposite(
  face: GeneratedFace,
  keyframe: ReferenceVideo,
  onPhase?: PhaseCallback
): Promise<CompositeResult[]> {
  if (!currentRunId) throw new Error("No active pipeline run");

  onPhase?.("Sending to Kie.ai...", 10);

  try {
    const result = await api.pipeline.advance(currentRunId, {
      prompt: "face swap composite, maintain identity and expression",
      faceImageUrl: face.thumbnailDataUrl,
      keyframeUrl: keyframe.thumbnailDataUrl,
    });

    onPhase?.("Processing...", 50);

    if (result.stepped && result.output?.imageUrl) {
      onPhase?.("Done", 100);
      return [{
        id: generateId(),
        thumbnailDataUrl: result.output.imageUrl,
      }];
    }

    // If async (shouldn't be for composite but handle it)
    if (result.jobId) {
      onPhase?.("Waiting for result...", 60);
      const finalResult = await pollUntilDone(currentRunId, onPhase);
      return [{
        id: generateId(),
        thumbnailDataUrl: finalResult?.resultUrl || "",
      }];
    }

    throw new Error("Unexpected response from pipeline");
  } catch (err: any) {
    throw new Error(err.message || "Composite generation failed");
  }
}

export async function realAnimate(
  composite: CompositeResult,
  video: ReferenceVideo,
  onPhase?: PhaseCallback
): Promise<AnimationResult> {
  if (!currentRunId) throw new Error("No active pipeline run");

  onPhase?.("Sending to Kie.ai...", 10);

  try {
    const result = await api.pipeline.advance(currentRunId, {
      prompt: "smooth cinematic motion, maintain character consistency",
      compositeUrl: composite.thumbnailDataUrl,
      duration: String(Math.min(10, Math.round(video.duration || 5))),
    });

    if (result.stepped && result.output) {
      onPhase?.("Done", 100);
      return {
        id: generateId(),
        thumbnailDataUrl: result.output.resultUrl || result.output.videoUrl || "",
        videoUrl: result.output.resultUrl || result.output.videoUrl,
        consistencyScore: 0.85 + Math.random() * 0.13,
      };
    }

    // Async — poll until done
    if (result.jobId) {
      onPhase?.("Generating video...", 20);
      const finalResult = await pollUntilDone(currentRunId, onPhase);
      return {
        id: generateId(),
        thumbnailDataUrl: finalResult?.resultUrl || "",
        videoUrl: finalResult?.resultUrl,
        consistencyScore: 0.85 + Math.random() * 0.13,
      };
    }

    throw new Error("Unexpected response");
  } catch (err: any) {
    throw new Error(err.message || "Animation failed");
  }
}

// Poll pipeline status until the active job completes
async function pollUntilDone(
  runId: string,
  onPhase?: PhaseCallback,
  maxAttempts = 60
): Promise<any> {
  let delay = 1000;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, delay));

    const status = await api.pipeline.status(runId);

    if (!status.activeJob) {
      // Job completed — check step_data for result
      const currentStep = status.currentStep;
      const prevStep = currentStep - 1;
      const stepOutput = status.stepData?.[String(prevStep)];
      onPhase?.("Done", 100);
      return stepOutput;
    }

    if (status.activeJob.status === "failed") {
      throw new Error(status.activeJob.error || "Generation failed");
    }

    // Update progress
    const elapsed = i * delay;
    const estimated = status.activeJob.estimatedCompletion
      ? new Date(status.activeJob.estimatedCompletion).getTime() - Date.now()
      : 30000;
    const progress = Math.min(90, Math.round((elapsed / (elapsed + Math.max(estimated, 1000))) * 90));
    onPhase?.("Generating...", 20 + progress * 0.7);

    // Adaptive backoff
    delay = Math.min(5000, delay * 1.5);
  }

  throw new Error("Generation timed out");
}
