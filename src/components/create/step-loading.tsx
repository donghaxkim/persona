"use client";

import { AnimatePresence, motion } from "motion/react";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface StepLoadingProps {
  phase: string;
  progress: number;
}

export function StepLoading({ phase, progress }: StepLoadingProps) {
  return (
    <div className="py-6 space-y-4">
      {/* Progress bar */}
      <div className="h-[2px] rounded-full bg-foreground/5 overflow-hidden">
        <motion.div
          className="h-full bg-foreground/25 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease }}
        />
      </div>

      {/* Phase message */}
      <div className="flex items-center justify-between">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="text-sm text-muted-foreground"
          >
            {phase}
          </motion.p>
        </AnimatePresence>
        <span className="text-xs text-muted-foreground/30 tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
