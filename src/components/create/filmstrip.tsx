"use client";

import type { PipelineState, PipelineStep } from "@/lib/types";
import { usePersonaStore } from "@/lib/store";
import { FilmstripCard } from "./filmstrip-card";

interface FilmstripProps {
  pipeline: PipelineState;
}

function getThumbnail(pipeline: PipelineState, step: PipelineStep): string | undefined {
  switch (step) {
    case 1:
      return pipeline.steps[1].selected?.thumbnailDataUrl;
    case 2:
      return pipeline.steps[2].grid?.thumbnailDataUrl;
    case 3:
      return pipeline.steps[3].video?.thumbnailDataUrl;
    case 4:
      return pipeline.steps[4].selected?.thumbnailDataUrl;
    case 5:
      return pipeline.steps[5].result?.thumbnailDataUrl;
  }
}

export function Filmstrip({ pipeline }: FilmstripProps) {
  const setActiveStep = usePersonaStore((s) => s.setActiveStep);
  const goToStep = usePersonaStore((s) => s.goToStep);
  const injectAsset = usePersonaStore((s) => s.injectAsset);

  const steps: PipelineStep[] = [1, 2, 3, 4, 5];

  const handleStepClick = (step: PipelineStep) => {
    if (step === pipeline.activeStep) return;
    if (step < pipeline.activeStep) {
      // Going backward — invalidates downstream
      goToStep(step);
    } else {
      // Going forward — just navigate, step component handles missing prereqs
      setActiveStep(step);
    }
  };

  return (
    <div className="glass flex-shrink-0 mx-4 mt-3 rounded-2xl px-4 py-3">
      <div className="flex items-center justify-center gap-0">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center">
            <FilmstripCard
              step={step}
              status={pipeline.steps[step].status}
              isActive={pipeline.activeStep === step}
              thumbnailDataUrl={getThumbnail(pipeline, step)}
              onClick={() => handleStepClick(step)}
              onUpload={(file) => injectAsset(step, file)}
            />
            {i < steps.length - 1 && (
              <div className="flex items-center mx-1.5">
                <div className={
                  pipeline.steps[step].status === "confirmed"
                    ? "w-5 h-[1.5px] bg-foreground/20 rounded-full"
                    : "w-5 h-[1.5px] bg-foreground/8 rounded-full"
                } />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
