"use client";

import { useState, useCallback, useMemo } from "react";
import type { Influencer, PipelineStep } from "@/lib/types";
import { usePersonaStore } from "@/lib/store";
import { ProgressRail } from "./progress-rail";
import { StepTransition } from "./step-transition";
import { ConfirmDialog } from "./confirm-dialog";
import { StepSelectVideo } from "./steps/step-select-video";
import { StepComposite } from "./steps/step-composite";
import { StepAnimate } from "./steps/step-animate";

interface CreateViewProps {
  influencer: Influencer;
}

function ActiveStep({ step, influencer }: { step: PipelineStep; influencer: Influencer }) {
  switch (step) {
    case 1: return <StepSelectVideo />;
    case 2: return <StepComposite influencer={influencer} />;
    case 3: return <StepAnimate influencer={influencer} />;
  }
}

export function CreateView({ influencer }: CreateViewProps) {
  const pipeline = usePersonaStore((s) => s.pipeline);
  const initPipeline = usePersonaStore((s) => s.initPipeline);
  const setActiveStep = usePersonaStore((s) => s.setActiveStep);
  const setActiveView = usePersonaStore((s) => s.setActiveView);
  const goToStep = usePersonaStore((s) => s.goToStep);

  const [confirmTarget, setConfirmTarget] = useState<PipelineStep | null>(null);

  const acceptedRefs = useMemo(
    () => influencer.referenceImages.filter((r) => r.status === "accepted"),
    [influencer.referenceImages]
  );

  const hasEnoughRefs = acceptedRefs.length >= 1;

  const handleNavigate = useCallback((step: PipelineStep, direction: "forward" | "backward") => {
    if (!pipeline) return;
    if (direction === "backward") {
      const hasDownstreamWork = Array.from({ length: 3 - step }, (_, i) => (step + 1 + i) as PipelineStep)
        .some((s) => pipeline.steps[s].status !== "empty");
      if (hasDownstreamWork) {
        setConfirmTarget(step);
        return;
      }
      goToStep(step);
    } else {
      setActiveStep(step);
    }
  }, [pipeline, goToStep, setActiveStep]);

  const handleConfirmBack = useCallback(() => {
    if (confirmTarget !== null) {
      goToStep(confirmTarget);
      setConfirmTarget(null);
    }
  }, [confirmTarget, goToStep]);

  if (!pipeline) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <div className="glass-panel rounded-3xl p-8 max-w-[360px] w-full text-center animate-slide-up">
          <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/60">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold tracking-tight">
            Bring {influencer.name} to life
          </h3>
          {hasEnoughRefs ? (
            <>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {acceptedRefs.length} reference{acceptedRefs.length === 1 ? "" : "s"} ready.
                Upload a motion video to get started.
              </p>
              <button
                onClick={initPipeline}
                className="mt-5 w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity duration-500"
              >
                Select a motion video
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Add at least one reference photo in the References tab first.
              </p>
              <button
                onClick={() => setActiveView("references")}
                className="mt-5 w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity duration-500"
              >
                Go to References
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ProgressRail pipeline={pipeline} onNavigate={handleNavigate} />
      <div className="flex-1 overflow-y-auto pb-6">
        <StepTransition activeStep={pipeline.activeStep}>
          <ActiveStep step={pipeline.activeStep} influencer={influencer} />
        </StepTransition>
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Go back?"
        description={
          confirmTarget !== null
            ? `Going back to step ${confirmTarget} will reset steps ${confirmTarget + 1}\u2013${3}. Your progress in those steps will be lost.`
            : ""
        }
        confirmLabel="Go back"
        onConfirm={handleConfirmBack}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
