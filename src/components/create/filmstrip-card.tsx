"use client";

import type { PipelineStep, StepStatus } from "@/lib/types";
import { PIPELINE_STEPS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FilmstripCardProps {
  step: PipelineStep;
  status: StepStatus;
  isActive: boolean;
  thumbnailDataUrl?: string;
  onClick: () => void;
  onUpload?: (file: File) => void;
}

export function FilmstripCard({
  step,
  status,
  isActive,
  thumbnailDataUrl,
  onClick,
  onUpload,
}: FilmstripCardProps) {
  const meta = PIPELINE_STEPS.find((s) => s.step === step)!;

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const input = document.createElement("input");
    input.type = "file";
    input.accept = meta.acceptType;
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (file && onUpload) onUpload(file);
    };
    input.click();
  };

  const isCompleted = status === "confirmed";
  const isEmpty = status === "empty";
  const isFuture = isEmpty && !isActive;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        className={cn(
          "relative w-[80px] h-[52px] rounded-xl overflow-hidden transition-all duration-200 group cursor-pointer",
          isActive && "filmstrip-card-active ring-glow",
          isEmpty && "filmstrip-placeholder",
          isCompleted && "glass-card",
          status === "failed" && "glass-card ring-1 ring-[var(--color-status-failed)]/50",
          status === "selecting" && "glass-card ring-2 ring-[var(--color-status-pending)]/60",
          status === "generating" && "glass-card",
          isFuture && "opacity-50 hover:opacity-70",
        )}
      >
        {/* Thumbnail or step number */}
        {thumbnailDataUrl && !isEmpty ? (
          <img
            src={thumbnailDataUrl}
            alt={meta.label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-0.5">
            <span className="text-[0.65rem] font-semibold text-muted-foreground/40">
              {step}
            </span>
          </div>
        )}

        {/* Generating pulse overlay */}
        {status === "generating" && (
          <div className="absolute inset-0 bg-foreground/5 animate-step-pulse flex items-center justify-center">
            <div className="spinner" />
          </div>
        )}

        {/* Failed overlay */}
        {status === "failed" && (
          <div className="absolute inset-0 bg-[var(--color-status-failed)]/8 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-status-failed)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        {/* Confirmed checkmark */}
        {isCompleted && (
          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--color-status-ready)] flex items-center justify-center shadow-sm">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}

        {/* Upload affordance on hover */}
        {onUpload && (
          <div
            onClick={handleUploadClick}
            className="absolute bottom-1 right-1 w-5 h-5 rounded-md bg-foreground/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer hover:bg-foreground/70"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
        )}
      </button>

      {/* Label */}
      <span className={cn(
        "text-[0.6rem] uppercase tracking-[0.08em] font-medium transition-colors duration-200",
        isActive ? "text-foreground" : "text-muted-foreground/60"
      )}>
        {meta.label}
      </span>
    </div>
  );
}
