"use client";

import { useCallback, useState } from "react";
import { usePersonaStore } from "@/lib/store";
import { simulateGenerateFaces } from "@/lib/mock-pipeline";
import type { GeneratedFace } from "@/lib/types";
import { StepShell } from "../step-shell";
import { StepControls } from "../step-controls";
import { cn } from "@/lib/utils";

export function StepGenerateFace() {
  const pipeline = usePersonaStore((s) => s.pipeline);
  const updateStepStatus = usePersonaStore((s) => s.updateStepStatus);
  const setStepOptions = usePersonaStore((s) => s.setStepOptions);
  const selectFace = usePersonaStore((s) => s.selectFace);

  const [prompt, setPrompt] = useState("A female K-pop idol");
  const [selected, setSelected] = useState<GeneratedFace | null>(null);
  const [error, setError] = useState<string | null>(null);

  const step1 = pipeline?.steps[1];
  const isGenerating = step1?.status === "generating";
  const options = step1?.options ?? [];

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setError(null);
    setSelected(null);
    updateStepStatus(1, "generating");
    try {
      const faces = await simulateGenerateFaces();
      setStepOptions(1, faces);
    } catch (err) {
      updateStepStatus(1, "failed");
      setError(err instanceof Error ? err.message : "Generation failed");
    }
  }, [prompt, updateStepStatus, setStepOptions]);

  const handleConfirm = useCallback(() => {
    if (!selected) return;
    selectFace(selected);
  }, [selected, selectFace]);

  return (
    <StepShell step={1}>
      {/* Prompt + generate */}
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the face to generate..."
          className="flex-1 h-9 rounded-xl bg-foreground/[0.03] border border-border/50 px-3.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all duration-200"
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={cn(
            "px-4 h-9 rounded-xl text-sm font-medium transition-all duration-200",
            isGenerating
              ? "bg-foreground/5 text-muted-foreground cursor-wait"
              : "bg-foreground text-background hover:opacity-90"
          )}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
              Generating
            </span>
          ) : "Generate"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card rounded-xl p-3 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-status-failed)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-sm text-[var(--color-status-failed)]">{error}</p>
        </div>
      )}

      {/* Generating skeleton */}
      {isGenerating && options.length === 0 && (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-foreground/[0.03] animate-step-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {/* Face grid */}
      {options.length > 0 && (
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.08em] font-medium text-muted-foreground/50 mb-2">
            Select a face
          </p>
          <div className="grid grid-cols-3 gap-2">
            {options.map((face) => (
              <button
                key={face.id}
                onClick={() => setSelected(face)}
                className={cn(
                  "aspect-square rounded-xl overflow-hidden transition-all duration-200",
                  selected?.id === face.id
                    ? "ring-glow scale-[1.02]"
                    : "ring-1 ring-border/30 hover:ring-border"
                )}
              >
                <img
                  src={face.thumbnailDataUrl}
                  alt="Generated face"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      {options.length > 0 && (
        <StepControls
          onPrimary={handleConfirm}
          primaryLabel="Continue"
          primaryDisabled={!selected}
          onSecondary={handleGenerate}
          secondaryLabel="Regenerate"
        />
      )}
    </StepShell>
  );
}
