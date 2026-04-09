"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import type { AnimationResult, ReferenceVideo } from "@/lib/types";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface CompletionSheetProps {
  open: boolean;
  result: AnimationResult;
  video: ReferenceVideo | null;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function CompletionSheet({ open, result, video, onSave, onCancel }: CompletionSheetProps) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => onSave(name || "Untitled"), 1200);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="relative glass-panel rounded-3xl p-6 max-w-[420px] w-full mx-4"
          >
            {saved ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease }}
                className="py-12 flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-full bg-[var(--color-status-ready)] flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm font-medium">Saved to library</p>
              </motion.div>
            ) : (
              <>
                <div className="rounded-xl overflow-hidden ring-1 ring-border/30 mb-4">
                  <img src={result.thumbnailDataUrl} alt="Result" className="w-full aspect-video object-cover" />
                  <div className="px-4 py-2.5 flex items-center justify-between bg-foreground/[0.02]">
                    <span className="text-xs text-muted-foreground">{video ? `${video.duration}s` : "Video"}</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: result.consistencyScore >= 0.9
                            ? "var(--color-status-ready)"
                            : result.consistencyScore >= 0.85
                              ? "var(--color-status-pending)"
                              : "var(--color-status-failed)",
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {(result.consistencyScore * 100).toFixed(0)}% consistency
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[0.6rem] uppercase tracking-[0.08em] font-medium text-muted-foreground/50 mb-1.5 block">
                    Name (optional)
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Untitled"
                    className="w-full h-9 rounded-xl bg-foreground/[0.03] border border-border/50 px-3.5 text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all duration-400"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onCancel}
                    className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors duration-400"
                  >
                    Keep editing
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity duration-400"
                  >
                    Save to Library
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
