"use client";

import { motion } from "motion/react";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface StepErrorProps {
  message: string;
  onRetry: () => void;
  retryCount?: number;
  maxRetries?: number;
}

export function StepError({ message, onRetry, retryCount = 0, maxRetries = 3 }: StepErrorProps) {
  const canRetry = retryCount < maxRetries;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease }}
      className="rounded-xl p-4 bg-[var(--color-status-pending)]/8 border border-[var(--color-status-pending)]/15"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-5 h-5 rounded-full bg-[var(--color-status-pending)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="oklch(0.55 0.15 60)" strokeWidth="2" strokeLinecap="round">
            <path d="M12 9v4m0 4h.01" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground/80">
            That didn&apos;t quite work
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        </div>
      </div>

      {canRetry && (
        <button
          onClick={onRetry}
          className="mt-3 w-full py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity duration-500"
        >
          Try again
        </button>
      )}

      {retryCount >= 2 && canRetry && (
        <p className="text-[0.6rem] text-muted-foreground/50 text-center mt-1.5">
          Attempt {retryCount + 1} of {maxRetries}
        </p>
      )}

      {!canRetry && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Maximum retries reached. Try adjusting your inputs.
        </p>
      )}
    </motion.div>
  );
}
