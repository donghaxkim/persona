"use client";

import { Button } from "@/components/ui/button";

interface StepControlsProps {
  onBack?: () => void;
  onPrimary?: () => void;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  onSecondary?: () => void;
  secondaryLabel?: string;
}

export function StepControls({
  onBack,
  onPrimary,
  primaryLabel = "Continue",
  primaryDisabled = false,
  onSecondary,
  secondaryLabel,
}: StepControlsProps) {
  return (
    <div className="flex items-center gap-2 pt-1">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
      )}
      <div className="flex-1" />
      {onSecondary && secondaryLabel && (
        <button
          onClick={onSecondary}
          className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-foreground/5"
        >
          {secondaryLabel}
        </button>
      )}
      {onPrimary && (
        <Button
          size="sm"
          onClick={onPrimary}
          disabled={primaryDisabled}
          className="rounded-xl px-5 text-sm h-8"
        >
          {primaryLabel}
        </Button>
      )}
    </div>
  );
}
