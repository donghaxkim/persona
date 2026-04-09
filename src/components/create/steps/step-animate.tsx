"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Influencer } from "@/lib/types";
import { usePersonaStore } from "@/lib/store";
import { realAnimate as simulateAnimate } from "@/lib/real-pipeline";
import { generateId } from "@/lib/utils";
import { StepShell } from "../step-shell";
import { StepControls } from "../step-controls";
import { StepLoading } from "../step-loading";
import { StepError } from "../step-error";
import { CompletionSheet } from "../completion-sheet";
import { VIDEO_GRADIENTS } from "@/lib/constants";

interface StepAnimateProps {
  influencer: Influencer;
}

export function StepAnimate({ influencer }: StepAnimateProps) {
  const pipeline = usePersonaStore((s) => s.pipeline);
  const activeInfluencerId = usePersonaStore((s) => s.activeInfluencerId);
  const updateStepStatus = usePersonaStore((s) => s.updateStepStatus);
  const setAnimationResult = usePersonaStore((s) => s.setAnimationResult);
  const addVideo = usePersonaStore((s) => s.addVideo);
  const clearPipeline = usePersonaStore((s) => s.clearPipeline);
  const setActiveView = usePersonaStore((s) => s.setActiveView);
  const goToStep = usePersonaStore((s) => s.goToStep);

  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const retryCountRef = useRef(0);

  const composite = pipeline?.steps[2].selected;
  const video = pipeline?.steps[1].video;
  const step3 = pipeline?.steps[3];
  const result = step3?.result;
  const isGenerating = step3?.status === "generating";

  const generate = useCallback(async (autoRetry = false) => {
    if (!composite || !video) return;
    setError(null);
    setProgress(0);
    updateStepStatus(3, "generating");
    try {
      const result = await simulateAnimate(composite, video, (p, pct) => {
        setPhase(p);
        setProgress(pct);
      });
      setAnimationResult(result);
    } catch (err) {
      if (!autoRetry && retryCountRef.current === 0) {
        retryCountRef.current = 1;
        setPhase("Trying again...");
        generate(true);
        return;
      }
      updateStepStatus(3, "failed");
      setError(err instanceof Error ? err.message : "Animation failed");
    }
  }, [composite, video, updateStepStatus, setAnimationResult]);

  useEffect(() => {
    if (step3?.status === "empty" && composite && video) generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = useCallback(() => {
    retryCountRef.current++;
    generate(true);
  }, [generate]);

  const handleSave = useCallback((name: string) => {
    if (!result || !activeInfluencerId) return;
    const gradient = VIDEO_GRADIENTS[Math.floor(Math.random() * VIDEO_GRADIENTS.length)];
    addVideo(activeInfluencerId, {
      id: generateId(),
      influencerId: activeInfluencerId,
      prompt: name || "Pipeline-generated video",
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

  if (!composite || !video) {
    return (
      <StepShell step={3}>
        <p className="text-sm text-muted-foreground">
          {!video ? "Upload a motion video in step 1 first." : "Select a composite in step 2 first."}
        </p>
        <StepControls onBack={() => goToStep(!video ? 1 : 2)} />
      </StepShell>
    );
  }

  return (
    <StepShell step={3}>
      <div className="glass-card rounded-xl p-2.5">
        <img src={composite.thumbnailDataUrl} alt="Composite" className="w-full aspect-video rounded-lg object-cover" />
        <p className="text-[0.6rem] text-center text-muted-foreground/50 mt-1.5 font-medium">Composite input</p>
      </div>

      {isGenerating && <StepLoading phase={phase} progress={progress} />}

      {error && (
        <StepError
          message={error}
          onRetry={handleRetry}
          retryCount={retryCountRef.current}
        />
      )}

      {result && !isGenerating && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-xl overflow-hidden ring-1 ring-border/30">
            <img src={result.thumbnailDataUrl} alt="Result" className="w-full aspect-video object-cover" />
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
              onClick={() => setShowCompletion(true)}
              className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity duration-500"
            >
              Save to Library
            </button>
            {retryCountRef.current < 3 && (
              <button
                onClick={handleRetry}
                className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors duration-400"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      <StepControls onBack={() => goToStep(2)} />

      {result && (
        <CompletionSheet
          open={showCompletion}
          result={result}
          video={video}
          onSave={handleSave}
          onCancel={() => setShowCompletion(false)}
        />
      )}
    </StepShell>
  );
}
