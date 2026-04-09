"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PipelineStep } from "@/lib/types";

interface StepTransitionProps {
  activeStep: PipelineStep;
  children: ReactNode;
}

export function StepTransition({ activeStep, children }: StepTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeStep}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
