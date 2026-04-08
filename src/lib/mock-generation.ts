import { GENERATION_STAGES, FAILURE_REASONS, VIDEO_GRADIENTS } from "./constants";
import type { Video } from "./types";

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function simulateGeneration(
  onProgress: (stage: string, progress: number) => void,
  onComplete: (result: Partial<Video>) => void,
  onError: (reason: string) => void
): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const rafs: number[] = [];
  let cancelled = false;

  const willFail = Math.random() > 0.9;
  const failAtStage = willFail
    ? Math.floor(Math.random() * GENERATION_STAGES.length)
    : -1;

  let elapsed = 0;

  for (let i = 0; i < GENERATION_STAGES.length; i++) {
    const stage = GENERATION_STAGES[i];
    const prevProgress = i === 0 ? 0 : GENERATION_STAGES[i - 1].targetProgress;
    const stageStart = elapsed;

    // Schedule stage start
    timers.push(
      setTimeout(() => {
        if (cancelled) return;

        // Check if this stage should fail
        if (willFail && i === failAtStage) {
          const halfway = stageStart + stage.durationMs / 2;
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              onError(randomFrom(FAILURE_REASONS));
            }, stage.durationMs / 2)
          );
          // Still animate progress up to failure point
          const failProgress =
            prevProgress + (stage.targetProgress - prevProgress) * 0.5;
          animateProgress(
            prevProgress,
            failProgress,
            stage.durationMs / 2,
            onProgress,
            stage.label,
            rafs,
            () => cancelled
          );
          return;
        }

        animateProgress(
          prevProgress,
          stage.targetProgress,
          stage.durationMs,
          onProgress,
          stage.label,
          rafs,
          () => cancelled
        );
      }, stageStart)
    );

    elapsed += stage.durationMs;
  }

  // Schedule completion
  if (!willFail) {
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        onComplete({
          status: "ready",
          consistencyScore:
            Math.round((0.82 + Math.random() * 0.16) * 100) / 100,
          thumbnailGradient: randomFrom(VIDEO_GRADIENTS),
        });
      }, elapsed + 100)
    );
  }

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
    rafs.forEach(cancelAnimationFrame);
  };
}

function animateProgress(
  from: number,
  to: number,
  durationMs: number,
  onProgress: (stage: string, progress: number) => void,
  stageLabel: string,
  rafStore: number[],
  isCancelled: () => boolean
) {
  const startTime = performance.now();

  function tick() {
    if (isCancelled()) return;
    const elapsed = performance.now() - startTime;
    const t = Math.min(1, elapsed / durationMs);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    const current = from + (to - from) * eased;
    onProgress(stageLabel, Math.round(current));
    if (t < 1) {
      rafStore.push(requestAnimationFrame(tick));
    }
  }

  rafStore.push(requestAnimationFrame(tick));
}
