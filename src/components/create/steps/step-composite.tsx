"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePersonaStore } from "@/lib/store";
import { simulateComposite } from "@/lib/mock-pipeline";
import type { CompositeResult, Influencer } from "@/lib/types";
import { StepShell } from "../step-shell";
import { StepControls } from "../step-controls";
import { StepLoading } from "../step-loading";
import { StepError } from "../step-error";
import { cn } from "@/lib/utils";

interface StepCompositeProps {
  influencer: Influencer;
}

export function StepComposite({ influencer }: StepCompositeProps) {
  const pipeline = usePersonaStore((s) => s.pipeline);
  const updateStepStatus = usePersonaStore((s) => s.updateStepStatus);
  const setCompositeOptions = usePersonaStore((s) => s.setCompositeOptions);
  const selectComposite = usePersonaStore((s) => s.selectComposite);
  const goToStep = usePersonaStore((s) => s.goToStep);

  const [selected, setSelected] = useState<CompositeResult | null>(null);
  const [expanded, setExpanded] = useState<CompositeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const retryCountRef = useRef(0);

  const acceptedRefs = useMemo(
    () => influencer.referenceImages.filter((r) => r.status === "accepted"),
    [influencer.referenceImages]
  );
  const faceRef = acceptedRefs[0] ?? null;
  const keyframe = (pipeline?.steps[1] as any)?.video;
  const step2 = pipeline?.steps[2] as any;
  const options = step2?.options ?? [];
  const isGenerating = step2?.status === "generating";

  const generate = useCallback(async (autoRetry = false) => {
    if (!faceRef || !keyframe) return;
    setError(null);
    setSelected(null);
    setExpanded(null);
    updateStepStatus(2, "generating");
    try {
      const face = { id: faceRef.id, thumbnailDataUrl: faceRef.thumbnailDataUrl };
      const results = await simulateComposite(face, keyframe, (p: string, pct: number) => {
        setPhase(p);
        setProgress(pct);
      });
      setCompositeOptions(results);
    } catch (err) {
      if (!autoRetry && retryCountRef.current === 0) {
        retryCountRef.current = 1;
        setPhase("Trying again...");
        generate(true);
        return;
      }
      updateStepStatus(2, "failed");
      setError(err instanceof Error ? err.message : "Composite generation failed");
    }
  }, [faceRef, keyframe, updateStepStatus, setCompositeOptions]);

  useEffect(() => {
    if (step2?.status === "empty" && faceRef && keyframe) generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTapComposite = useCallback((comp: CompositeResult) => {
    if (selected?.id === comp.id) {
      setExpanded(expanded?.id === comp.id ? null : comp);
    } else {
      setSelected(comp);
      setExpanded(null);
    }
  }, [selected, expanded]);

  const handleConfirm = useCallback(() => {
    if (!selected) return;
    selectComposite(selected);
  }, [selected, selectComposite]);

  if (!keyframe) {
    return (
      <StepShell step={2}>
        <p className="text-sm text-muted-foreground">Upload a motion video in step 1 first.</p>
        <StepControls onBack={() => goToStep(1)} />
      </StepShell>
    );
  }

  return (
    <StepShell step={2}>
      {/* Inputs: reference face + keyframe */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-2.5">
          {faceRef ? (
            <img src={faceRef.thumbnailDataUrl} alt="Face" className="w-full aspect-square rounded-lg object-cover" />
          ) : (
            <div className="w-full aspect-square rounded-lg bg-foreground/5 flex items-center justify-center text-xs text-muted-foreground/40">No ref</div>
          )}
          <p className="text-[0.6rem] text-center text-muted-foreground/50 mt-1.5 font-medium">Reference face</p>
        </div>
        <div className="glass-card rounded-xl p-2.5">
          <img src={keyframe.thumbnailDataUrl} alt="Motion" className="w-full aspect-square rounded-lg object-cover" />
          <p className="text-[0.6rem] text-center text-muted-foreground/50 mt-1.5 font-medium">Motion</p>
        </div>
      </div>

      {isGenerating && <StepLoading phase={phase} progress={progress} />}

      {error && (
        <StepError
          message={error}
          onRetry={() => { retryCountRef.current++; generate(true); }}
          retryCount={retryCountRef.current}
        />
      )}

      {options.length > 0 && !isGenerating && (
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.08em] font-medium text-muted-foreground/50 mb-2">
            Select a composite
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {options.map((comp: CompositeResult) => (
              <button
                key={comp.id}
                onClick={() => handleTapComposite(comp)}
                className={cn(
                  "aspect-video rounded-xl overflow-hidden transition-all duration-500 ease-out",
                  selected?.id === comp.id
                    ? "ring-glow"
                    : "ring-1 ring-border/30 hover:ring-border/60"
                )}
              >
                <img src={comp.thumbnailDataUrl} alt="Composite" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {expanded && (
            <div className="mt-3 space-y-2 animate-fade-in">
              <div className="rounded-xl overflow-hidden ring-1 ring-border/30">
                <img src={expanded.thumbnailDataUrl} alt="Expanded" className="w-full aspect-video object-cover" />
              </div>
              <div className="flex gap-2">
                {faceRef && (
                  <div className="flex-1 flex items-center gap-2 text-[0.6rem] text-muted-foreground/50">
                    <img src={faceRef.thumbnailDataUrl} alt="" className="w-6 h-6 rounded object-cover" />
                    Reference face
                  </div>
                )}
                <div className="flex-1 flex items-center gap-2 text-[0.6rem] text-muted-foreground/50">
                  <img src={keyframe.thumbnailDataUrl} alt="" className="w-6 h-6 rounded object-cover" />
                  Motion source
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <StepControls
        onBack={() => goToStep(1)}
        onPrimary={options.length > 0 && !isGenerating ? handleConfirm : undefined}
        primaryLabel="Continue"
        primaryDisabled={!selected}
        onSecondary={options.length > 0 && !isGenerating ? () => generate() : undefined}
        secondaryLabel="Regenerate"
      />
    </StepShell>
  );
}
