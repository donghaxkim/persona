"use client";

import { useCallback, useEffect, useState } from "react";
import { usePersonaStore } from "@/lib/store";
import { simulateGenerateGrid } from "@/lib/mock-pipeline";
import { StepShell } from "../step-shell";
import { StepControls } from "../step-controls";
import { StepNeedsInput } from "../step-needs-input";

export function StepGenerateGrid() {
  const pipeline = usePersonaStore((s) => s.pipeline);
  const updateStepStatus = usePersonaStore((s) => s.updateStepStatus);
  const setReferenceGrid = usePersonaStore((s) => s.setReferenceGrid);
  const confirmGrid = usePersonaStore((s) => s.confirmGrid);
  const goToStep = usePersonaStore((s) => s.goToStep);

  const [error, setError] = useState<string | null>(null);

  const face = pipeline?.steps[1].selected;
  const step2 = pipeline?.steps[2];
  const grid = step2?.grid;
  const isGenerating = step2?.status === "generating";

  const generate = useCallback(async () => {
    if (!face) return;
    setError(null);
    updateStepStatus(2, "generating");
    try {
      const result = await simulateGenerateGrid(face);
      setReferenceGrid(result);
    } catch (err) {
      updateStepStatus(2, "failed");
      setError(err instanceof Error ? err.message : "Grid generation failed");
    }
  }, [face, updateStepStatus, setReferenceGrid]);

  // Auto-trigger on mount when face is available
  useEffect(() => {
    if (step2?.status === "empty" && face) {
      generate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Missing prerequisites
  if (!face) {
    return (
      <StepShell step={2}>
        <StepNeedsInput
          needs={[
            { step: 1, label: "A generated or uploaded face" },
          ]}
        />
      </StepShell>
    );
  }

  return (
    <StepShell step={2}>
      {/* Source face chip */}
      <div className="flex items-center gap-2.5">
        <img
          src={face.thumbnailDataUrl}
          alt="Source face"
          className="w-10 h-10 rounded-lg object-cover ring-1 ring-border/30"
        />
        <div>
          <p className="text-xs font-medium">Source face</p>
          <p className="text-[0.6rem] text-muted-foreground/60">From step 1</p>
        </div>
      </div>

      {/* Generating state */}
      {isGenerating && (
        <div className="py-10 flex flex-col items-center gap-3">
          <div className="spinner" />
          <p className="text-sm text-muted-foreground">Generating 9 pose variants...</p>
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

      {/* Grid display */}
      {grid && (
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.08em] font-medium text-muted-foreground/50 mb-2">
            Pose grid
          </p>
          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            {grid.poses.map((pose) => (
              <div key={pose.id} className="aspect-square">
                <img
                  src={pose.thumbnailDataUrl}
                  alt="Pose variant"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <StepControls
        onBack={() => goToStep(1)}
        onPrimary={grid ? () => confirmGrid() : undefined}
        primaryLabel="Continue"
        primaryDisabled={!grid}
        onSecondary={grid ? generate : undefined}
        secondaryLabel="Regenerate"
      />
    </StepShell>
  );
}
