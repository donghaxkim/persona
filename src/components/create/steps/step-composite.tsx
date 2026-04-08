"use client";

import { useCallback, useEffect, useState } from "react";
import { usePersonaStore } from "@/lib/store";
import { simulateComposite } from "@/lib/mock-pipeline";
import type { CompositeResult } from "@/lib/types";
import { StepShell } from "../step-shell";
import { StepControls } from "../step-controls";
import { StepNeedsInput } from "../step-needs-input";
import { cn } from "@/lib/utils";

export function StepComposite() {
  const pipeline = usePersonaStore((s) => s.pipeline);
  const updateStepStatus = usePersonaStore((s) => s.updateStepStatus);
  const setCompositeOptions = usePersonaStore((s) => s.setCompositeOptions);
  const selectComposite = usePersonaStore((s) => s.selectComposite);
  const goToStep = usePersonaStore((s) => s.goToStep);

  const [selected, setSelected] = useState<CompositeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const face = pipeline?.steps[1].selected;
  const keyframe = pipeline?.steps[3].video;
  const step4 = pipeline?.steps[4];
  const options = step4?.options ?? [];
  const isGenerating = step4?.status === "generating";

  const generate = useCallback(async () => {
    if (!face || !keyframe) return;
    setError(null);
    setSelected(null);
    updateStepStatus(4, "generating");
    try {
      const results = await simulateComposite(face, keyframe);
      setCompositeOptions(results);
    } catch (err) {
      updateStepStatus(4, "failed");
      setError(err instanceof Error ? err.message : "Composite generation failed");
    }
  }, [face, keyframe, updateStepStatus, setCompositeOptions]);

  // Auto-trigger on mount if both inputs ready
  useEffect(() => {
    if (step4?.status === "empty" && face && keyframe) {
      generate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = useCallback(() => {
    if (!selected) return;
    selectComposite(selected);
  }, [selected, selectComposite]);

  // Missing prerequisites
  const missingNeeds = [];
  if (!face) missingNeeds.push({ step: 1 as const, label: "A generated or uploaded face" });
  if (!keyframe) missingNeeds.push({ step: 3 as const, label: "A reference video with motion" });

  if (missingNeeds.length > 0) {
    return (
      <StepShell step={4}>
        <StepNeedsInput needs={missingNeeds} />
      </StepShell>
    );
  }

  return (
    <StepShell step={4}>
      {/* Inputs side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-2.5">
          <img
            src={face!.thumbnailDataUrl}
            alt="Face"
            className="w-full aspect-square rounded-lg object-cover"
          />
          <p className="text-[0.6rem] text-center text-muted-foreground/50 mt-1.5 font-medium">Face</p>
        </div>
        <div className="glass-card rounded-xl p-2.5">
          <img
            src={keyframe!.thumbnailDataUrl}
            alt="Keyframe"
            className="w-full aspect-square rounded-lg object-cover"
          />
          <p className="text-[0.6rem] text-center text-muted-foreground/50 mt-1.5 font-medium">Motion</p>
        </div>
      </div>

      {/* Generating */}
      {isGenerating && (
        <div className="py-8 flex flex-col items-center gap-3">
          <div className="spinner" />
          <p className="text-sm text-muted-foreground">Generating composites...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card rounded-xl p-3 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-status-failed)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-sm text-[var(--color-status-failed)]">{error}</p>
          <button onClick={generate} className="ml-auto text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Retry
          </button>
        </div>
      )}

      {/* Composite options */}
      {options.length > 0 && (
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.08em] font-medium text-muted-foreground/50 mb-2">
            Select a composite
          </p>
          <div className="grid grid-cols-3 gap-2">
            {options.map((comp) => (
              <button
                key={comp.id}
                onClick={() => setSelected(comp)}
                className={cn(
                  "aspect-video rounded-xl overflow-hidden transition-all duration-200",
                  selected?.id === comp.id
                    ? "ring-glow scale-[1.02]"
                    : "ring-1 ring-border/30 hover:ring-border"
                )}
              >
                <img
                  src={comp.thumbnailDataUrl}
                  alt="Composite variant"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <StepControls
        onBack={() => goToStep(3)}
        onPrimary={options.length > 0 ? handleConfirm : undefined}
        primaryLabel="Continue"
        primaryDisabled={!selected}
        onSecondary={options.length > 0 ? generate : undefined}
        secondaryLabel="Regenerate"
      />
    </StepShell>
  );
}
