"use client";

import { useCallback, useEffect, useState } from "react";
import { usePersonaStore } from "@/lib/store";
import { simulateAnimate } from "@/lib/mock-pipeline";
import { generateId } from "@/lib/utils";
import { StepShell } from "../step-shell";
import { StepControls } from "../step-controls";
import { StepNeedsInput } from "../step-needs-input";
import { Progress } from "@/components/ui/progress";
import { VIDEO_GRADIENTS } from "@/lib/constants";

export function StepAnimate() {
  const pipeline = usePersonaStore((s) => s.pipeline);
  const activeInfluencerId = usePersonaStore((s) => s.activeInfluencerId);
  const updateStepStatus = usePersonaStore((s) => s.updateStepStatus);
  const setAnimationResult = usePersonaStore((s) => s.setAnimationResult);
  const addVideo = usePersonaStore((s) => s.addVideo);
  const clearPipeline = usePersonaStore((s) => s.clearPipeline);
  const setActiveView = usePersonaStore((s) => s.setActiveView);
  const goToStep = usePersonaStore((s) => s.goToStep);

  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const composite = pipeline?.steps[4].selected;
  const video = pipeline?.steps[3].video;
  const step5 = pipeline?.steps[5];
  const result = step5?.result;
  const isGenerating = step5?.status === "generating";

  const generate = useCallback(async () => {
    if (!composite || !video) return;
    setError(null);
    setProgress(0);
    updateStepStatus(5, "generating");

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 8, 95));
    }, 500);

    try {
      const result = await simulateAnimate(composite, video);
      clearInterval(interval);
      setProgress(100);
      setAnimationResult(result);
    } catch (err) {
      clearInterval(interval);
      updateStepStatus(5, "failed");
      setError(err instanceof Error ? err.message : "Animation failed");
    }
  }, [composite, video, updateStepStatus, setAnimationResult]);

  // Auto-trigger on mount
  useEffect(() => {
    if (step5?.status === "empty" && composite && video) {
      generate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = useCallback(() => {
    if (retryCount >= 3) return;
    setRetryCount((c) => c + 1);
    generate();
  }, [retryCount, generate]);

  const handleSave = useCallback(() => {
    if (!result || !activeInfluencerId) return;
    const gradient = VIDEO_GRADIENTS[Math.floor(Math.random() * VIDEO_GRADIENTS.length)];
    addVideo(activeInfluencerId, {
      id: generateId(),
      influencerId: activeInfluencerId,
      prompt: "Pipeline-generated video",
      template: "freeform",
      duration: video?.duration ?? 10,
      resolution: "1080p",
      status: "ready",
      consistencyScore: result.consistencyScore,
      thumbnailGradient: gradient,
      createdAt: new Date().toISOString(),
    });
    clearPipeline();
    setActiveView("profile");
  }, [result, activeInfluencerId, video, addVideo, clearPipeline, setActiveView]);

  // Missing prerequisites
  const missingNeeds = [];
  if (!composite) missingNeeds.push({ step: 4 as const, label: "A composite image (face + keyframe)" });
  if (!video) missingNeeds.push({ step: 3 as const, label: "A reference video with motion" });

  if (missingNeeds.length > 0) {
    return (
      <StepShell step={5}>
        <StepNeedsInput needs={missingNeeds} />
      </StepShell>
    );
  }

  return (
    <StepShell step={5}>
      {/* Composite input preview */}
      <div className="glass-card rounded-xl p-2.5">
        <img
          src={composite!.thumbnailDataUrl}
          alt="Composite"
          className="w-full aspect-video rounded-lg object-cover"
        />
        <p className="text-[0.6rem] text-center text-muted-foreground/50 mt-1.5 font-medium">Composite input</p>
      </div>

      {/* Generating */}
      {isGenerating && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="spinner" />
            <p className="text-sm text-muted-foreground">Animating...</p>
          </div>
          <Progress value={progress} className="h-1 rounded-full" />
        </div>
      )}

      {/* Error + retry */}
      {error && (
        <div className="glass-card rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-status-failed)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-sm text-[var(--color-status-failed)]">{error}</p>
          </div>
          {retryCount < 3 && (
            <button
              onClick={handleRetry}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors duration-200"
            >
              Retry ({3 - retryCount} remaining)
            </button>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden ring-1 ring-border/30">
            <img
              src={result.thumbnailDataUrl}
              alt="Animation result"
              className="w-full aspect-video object-cover"
            />
            <div className="px-4 py-2.5 flex items-center justify-between bg-foreground/[0.02]">
              <span className="text-xs text-muted-foreground">Final output</span>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      result.consistencyScore >= 0.9
                        ? "var(--color-status-ready)"
                        : result.consistencyScore >= 0.85
                          ? "var(--color-status-pending)"
                          : "var(--color-status-failed)",
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {(result.consistencyScore * 100).toFixed(0)}% consistency
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity duration-200"
            >
              Save to Library
            </button>
            {retryCount < 3 && (
              <button
                onClick={handleRetry}
                className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <StepControls
        onBack={() => goToStep(4)}
      />
    </StepShell>
  );
}
