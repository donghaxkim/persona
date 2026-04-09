"use client";

import { useCallback, useRef, useState } from "react";
import { usePersonaStore } from "@/lib/store";
import { extractVideoKeyframe } from "@/lib/mock-pipeline";
import { TEMPLATES } from "@/lib/constants";
import { StepShell } from "../step-shell";
import { StepControls } from "../step-controls";
import { StepError } from "../step-error";
import { cn } from "@/lib/utils";

export function StepSelectVideo() {
  const pipeline = usePersonaStore((s) => s.pipeline);
  const updateStepStatus = usePersonaStore((s) => s.updateStepStatus);
  const setReferenceVideo = usePersonaStore((s) => s.setReferenceVideo);
  const goToStep = usePersonaStore((s) => s.goToStep);

  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const step1 = pipeline?.steps[1] as any;
  const video = step1?.video;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setProcessing(true);
      updateStepStatus(1, "generating");
      try {
        const result = await extractVideoKeyframe(file);
        usePersonaStore.setState((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          (steps as any)[1] = { ...steps[1], video: result, status: "selecting" };
          return { pipeline: { ...state.pipeline, steps } };
        });
      } catch (err) {
        updateStepStatus(1, "failed");
        setError(err instanceof Error ? err.message : "Could not process video");
      } finally {
        setProcessing(false);
      }
    },
    [updateStepStatus]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) handleFile(file);
    },
    [handleFile]
  );

  const handleConfirm = useCallback(() => {
    if (!video) return;
    setReferenceVideo(video);
  }, [video, setReferenceVideo]);

  return (
    <StepShell step={1}>
      {/* Upload zone */}
      {!video && !processing && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "rounded-xl py-12 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200",
            isDragging
              ? "bg-foreground/[0.06] border-2 border-dashed border-foreground/20"
              : "bg-foreground/[0.02] border-2 border-dashed border-border/50 hover:border-foreground/15 hover:bg-foreground/[0.03]"
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground/60">
              <rect x="2" y="2" width="20" height="20" rx="3" />
              <polygon points="10 8 16 12 10 16 10 8" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Upload a reference video</p>
            <p className="text-xs text-muted-foreground/50 mt-0.5">
              The video whose motion your character will follow. MP4, MOV, or WebM.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      )}

      {/* Processing */}
      {processing && (
        <div className="py-10 flex flex-col items-center gap-3">
          <div className="spinner" />
          <p className="text-sm text-muted-foreground">Extracting keyframe...</p>
        </div>
      )}

      {/* Error */}
      {error && <StepError message={error} onRetry={() => fileInputRef.current?.click()} />}

      {/* Video preview */}
      {video && !processing && (
        <>
          <div className="rounded-xl overflow-hidden ring-1 ring-border/30">
            <img src={video.thumbnailDataUrl} alt="Keyframe" className="w-full aspect-video object-cover" />
            <div className="px-4 py-2.5 flex items-center gap-3 bg-foreground/[0.02]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground/50 flex-shrink-0">
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              <span className="text-xs text-muted-foreground truncate flex-1">{video.fileName}</span>
              <span className="text-xs text-muted-foreground/50">{video.duration}s</span>
            </div>
          </div>

          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.08em] font-medium text-muted-foreground/50 mb-2">
              Content type (optional)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setSelectedTemplate(selectedTemplate === t.value ? null : t.value)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs transition-all duration-200 border",
                    selectedTemplate === t.value
                      ? "bg-foreground text-background border-foreground"
                      : "bg-foreground/[0.06] text-muted-foreground border-border/40 hover:bg-foreground/[0.1]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <StepControls
        onBack={undefined}
        onPrimary={video && !processing ? handleConfirm : undefined}
        primaryLabel="Continue"
        primaryDisabled={!video}
      />
    </StepShell>
  );
}
