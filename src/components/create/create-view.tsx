"use client";

import type { Influencer, PipelineStep } from "@/lib/types";
import { usePersonaStore } from "@/lib/store";
import { Filmstrip } from "./filmstrip";
import { StepGenerateFace } from "./steps/step-generate-face";
import { StepGenerateGrid } from "./steps/step-generate-grid";
import { StepSelectVideo } from "./steps/step-select-video";
import { StepComposite } from "./steps/step-composite";
import { StepAnimate } from "./steps/step-animate";

interface CreateViewProps {
  influencer: Influencer;
}

function ActiveStep({ step }: { step: PipelineStep }) {
  switch (step) {
    case 1:
      return <StepGenerateFace />;
    case 2:
      return <StepGenerateGrid />;
    case 3:
      return <StepSelectVideo />;
    case 4:
      return <StepComposite />;
    case 5:
      return <StepAnimate />;
  }
}

export function CreateView({ influencer }: CreateViewProps) {
  const pipeline = usePersonaStore((s) => s.pipeline);
  const initPipeline = usePersonaStore((s) => s.initPipeline);

  if (!pipeline) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <div className="glass-panel rounded-3xl p-8 max-w-[380px] w-full text-center animate-slide-up">
          {/* Sparkle icon */}
          <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/60">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold tracking-tight">
            Create a video
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Generate a video for {influencer.name} in 5 steps.
            <br />
            Start from any step — upload what you have.
          </p>
          <button
            onClick={initPipeline}
            className="mt-5 w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity duration-200"
          >
            Start creating
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Filmstrip pipeline={pipeline} />
      <div className="flex-1 overflow-y-auto pb-6">
        <ActiveStep key={pipeline.activeStep} step={pipeline.activeStep} />
      </div>
    </div>
  );
}
