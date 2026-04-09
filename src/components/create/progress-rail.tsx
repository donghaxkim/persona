"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import type { PipelineState, PipelineStep } from "@/lib/types";
import { PIPELINE_STEPS } from "@/lib/constants";
import { usePersonaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface ProgressRailProps {
  pipeline: PipelineState;
  onNavigate: (step: PipelineStep, direction: "forward" | "backward") => void;
}

const ease = [0.25, 0.1, 0.25, 1] as const;

export function ProgressRail({ pipeline, onNavigate }: ProgressRailProps) {
  const injectAsset = usePersonaStore((s) => s.injectAsset);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStepRef = useRef<PipelineStep>(1);

  const steps: PipelineStep[] = [1, 2, 3];

  const handleStepClick = (step: PipelineStep) => {
    if (step === pipeline.activeStep) return;
    const direction = step > pipeline.activeStep ? "forward" : "backward";
    onNavigate(step, direction);
  };

  const handleUploadClick = (step: PipelineStep) => {
    uploadStepRef.current = step;
    const meta = PIPELINE_STEPS.find((s) => s.step === step)!;
    if (fileInputRef.current) {
      fileInputRef.current.accept = meta.acceptType;
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex-shrink-0 max-w-[600px] mx-auto w-full px-6 pt-4 pb-2">
      {/* Rail */}
      <div className="flex items-center justify-center">
        {steps.map((step, i) => {
          const status = pipeline.steps[step].status;
          const isActive = pipeline.activeStep === step;
          const isConfirmed = status === "confirmed";
          const isFailed = status === "failed";
          const isGenerating = status === "generating";
          const prevConfirmed = i > 0 && pipeline.steps[steps[i - 1]].status === "confirmed";

          return (
            <div key={step} className="flex items-center">
              {/* Connecting line */}
              {i > 0 && (
                <motion.div
                  className="h-[1.5px] w-8"
                  animate={{
                    backgroundColor: prevConfirmed
                      ? "oklch(0.16 0.005 60 / 0.25)"
                      : "oklch(0.16 0.005 60 / 0.08)",
                  }}
                  transition={{ duration: 0.5, ease }}
                />
              )}

              {/* Dot — same size always, 20px. Only opacity/fill changes. */}
              <button
                onClick={() => handleStepClick(step)}
                className="relative w-5 h-5 flex items-center justify-center cursor-pointer"
              >
                <motion.div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center",
                    !isActive && !isConfirmed && !isFailed && !isGenerating && "border-[1.5px] border-foreground/15"
                  )}
                  animate={{
                    backgroundColor: isActive || isConfirmed
                      ? "oklch(0.16 0.005 60)"
                      : isFailed
                        ? "oklch(0.627 0.258 29.234)"
                        : isGenerating
                          ? "oklch(0.16 0.005 60 / 0.2)"
                          : "transparent",
                    opacity: isActive ? 1 : isConfirmed ? 0.8 : 0.5,
                  }}
                  transition={{ duration: 0.5, ease }}
                >
                  {isConfirmed && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {(isActive || (!isConfirmed && !isFailed && !isGenerating)) && (
                    <span className={cn(
                      "text-[0.5rem] font-semibold",
                      isActive ? "text-background" : "text-muted-foreground/40"
                    )}>
                      {step}
                    </span>
                  )}
                  {isGenerating && !isActive && (
                    <div className="w-2 h-2 border border-foreground/30 border-t-foreground rounded-full animate-spin" />
                  )}
                  {isFailed && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </motion.div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Active step label */}
      <div className="text-center mt-2.5 min-h-[36px]">
        <motion.div
          key={pipeline.activeStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease }}
        >
          {(() => {
            const meta = PIPELINE_STEPS.find((s) => s.step === pipeline.activeStep)!;
            const status = pipeline.steps[pipeline.activeStep].status;
            return (
              <>
                <p className="text-xs font-medium tracking-wide">{meta.title}</p>
                {(status === "empty" || status === "failed") && (
                  <button
                    onClick={() => handleUploadClick(pipeline.activeStep)}
                    className="text-[0.6rem] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors duration-400 mt-0.5"
                  >
                    or {meta.uploadHint.toLowerCase()}
                  </button>
                )}
              </>
            );
          })()}
        </motion.div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) injectAsset(uploadStepRef.current, file);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />
    </div>
  );
}
