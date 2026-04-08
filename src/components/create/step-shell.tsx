"use client";

import type { ReactNode } from "react";
import type { PipelineStep } from "@/lib/types";
import { PIPELINE_STEPS } from "@/lib/constants";

interface StepShellProps {
  step: PipelineStep;
  children: ReactNode;
}

export function StepShell({ step, children }: StepShellProps) {
  const meta = PIPELINE_STEPS.find((s) => s.step === step)!;

  return (
    <div className="max-w-[600px] mx-auto px-6 py-5 animate-slide-up">
      {/* Step header */}
      <div className="mb-5">
        <div className="flex items-baseline gap-2">
          <span className="text-[0.6rem] uppercase tracking-[0.08em] font-medium text-muted-foreground/50">
            Step {step}
          </span>
        </div>
        <h3 className="text-base font-semibold mt-0.5 tracking-tight">
          {meta.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
          {meta.description}
        </p>
      </div>

      {/* Content */}
      <div className="glass-panel rounded-2xl p-5 space-y-5">
        {children}
      </div>
    </div>
  );
}
