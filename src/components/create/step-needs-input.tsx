"use client";

import { useRef } from "react";
import type { PipelineStep } from "@/lib/types";
import { PIPELINE_STEPS } from "@/lib/constants";
import { usePersonaStore } from "@/lib/store";

interface NeedItem {
  step: PipelineStep;
  label: string;
}

interface StepNeedsInputProps {
  needs: NeedItem[];
}

export function StepNeedsInput({ needs }: StepNeedsInputProps) {
  const setActiveStep = usePersonaStore((s) => s.setActiveStep);
  const injectAsset = usePersonaStore((s) => s.injectAsset);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        This step needs:
      </p>
      {needs.map((need) => {
        const meta = PIPELINE_STEPS.find((s) => s.step === need.step)!;
        return (
          <NeedRow
            key={need.step}
            step={need.step}
            label={need.label}
            uploadHint={meta.uploadHint}
            uploadDetail={meta.uploadDetail}
            acceptType={meta.acceptType}
            onGoToStep={() => setActiveStep(need.step)}
            onUpload={(file) => injectAsset(need.step, file)}
          />
        );
      })}
    </div>
  );
}

function NeedRow({
  step,
  label,
  uploadHint,
  uploadDetail,
  acceptType,
  onGoToStep,
  onUpload,
}: {
  step: PipelineStep;
  label: string;
  uploadHint: string;
  uploadDetail: string;
  acceptType: string;
  onGoToStep: () => void;
  onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="glass-card rounded-xl p-3.5 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs font-semibold text-muted-foreground/50">{step}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{uploadDetail}</p>
        <div className="flex gap-2 mt-2.5">
          <button
            onClick={onGoToStep}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 underline underline-offset-2"
          >
            Go to step {step}
          </button>
          <span className="text-xs text-muted-foreground/30">or</span>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 underline underline-offset-2"
          >
            {uploadHint}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={acceptType}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
        </div>
      </div>
    </div>
  );
}
