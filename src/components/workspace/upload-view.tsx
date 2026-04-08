"use client";

import { useCallback, useRef, useState } from "react";
import type { Influencer } from "@/lib/types";
import { usePersonaStore } from "@/lib/store";
import { generateId, cn } from "@/lib/utils";
import { resizeImage, saveImageBlob } from "@/lib/storage";
import { simulateValidation } from "@/lib/mock-validation";
import { ANGLES, EXPRESSIONS } from "@/lib/constants";

interface UploadViewProps {
  influencer: Influencer;
}

export function UploadView({ influencer }: UploadViewProps) {
  const addReferenceImage = usePersonaStore((s) => s.addReferenceImage);
  const updateImageStatus = usePersonaStore((s) => s.updateImageStatus);
  const removeReferenceImage = usePersonaStore((s) => s.removeReferenceImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCoverage, setShowCoverage] = useState(false);

  const acceptedRefs = influencer.referenceImages.filter(
    (r) => r.status === "accepted"
  );
  const pendingRefs = influencer.referenceImages.filter(
    (r) => r.status === "pending"
  );

  // Coverage calculation
  const coverageMap = new Map<string, number>();
  for (const ref of acceptedRefs) {
    const key = `${ref.angle}:${ref.expression}`;
    coverageMap.set(key, (coverageMap.get(key) || 0) + 1);
  }
  const totalCombos = ANGLES.length * EXPRESSIONS.length;
  const coveredCount = coverageMap.size;
  const coveragePercent = totalCombos > 0 ? Math.round((coveredCount / totalCombos) * 100) : 0;

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );

      for (const file of fileArray) {
        const imageId = generateId();

        try {
          const [medium, thumb] = await Promise.all([
            resizeImage(file, 800),
            resizeImage(file, 200),
          ]);

          await saveImageBlob(imageId, medium.blob);

          addReferenceImage(influencer.id, {
            id: imageId,
            influencerId: influencer.id,
            thumbnailDataUrl: thumb.dataUrl,
            angle: "front",
            expression: "neutral",
            framing: "close-up",
            status: "pending",
            createdAt: new Date().toISOString(),
          });

          simulateValidation().then((result) => {
            updateImageStatus(
              influencer.id,
              imageId,
              result.status,
              result.rejectionReason,
              result.status === "accepted"
                ? {
                    angle: result.angle,
                    expression: result.expression,
                    framing: result.framing,
                  }
                : undefined
            );
          });
        } catch {
          // Skip files that fail to process
        }
      }
    },
    [influencer.id, addReferenceImage, updateImageStatus]
  );

  return (
    <div className="max-w-[600px] mx-auto">
      {/* Header — just coverage button + validating count */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {pendingRefs.length > 0 && (
            <span>
              <span className="font-medium text-foreground">{pendingRefs.length}</span> validating
            </span>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowCoverage(!showCoverage)}
            className={cn(
              "text-xs px-3 py-1 rounded-full transition-colors duration-150 border",
              showCoverage
                ? "bg-foreground text-background border-foreground"
                : "glass border-border/50 text-muted-foreground hover:text-foreground"
            )}
          >
            Coverage {coveragePercent}%
          </button>

          {/* Coverage modal */}
          {showCoverage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setShowCoverage(false)}
              />
              <div className="relative z-10 glass rounded-2xl px-8 py-7 w-[380px] shadow-2xl animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-medium">Reference Coverage</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Angle × Expression distribution
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCoverage(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Big percentage */}
                <div className="text-center mb-6">
                  <p className="text-4xl font-semibold">{coveragePercent}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {coveredCount} of {totalCombos} combinations covered
                  </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-4 gap-2">
                  <div />
                  {EXPRESSIONS.map((exp) => (
                    <div
                      key={exp.value}
                      className="text-center text-[0.6rem] uppercase tracking-widest text-muted-foreground pb-1"
                    >
                      {exp.label}
                    </div>
                  ))}
                  {ANGLES.map((angle) => (
                    <>
                      <div
                        key={`label-${angle.value}`}
                        className="text-right text-[0.6rem] uppercase tracking-widest text-muted-foreground pr-2 flex items-center justify-end"
                      >
                        {angle.label}
                      </div>
                      {EXPRESSIONS.map((exp) => {
                        const key = `${angle.value}:${exp.value}`;
                        const count = coverageMap.get(key) || 0;
                        return (
                          <div
                            key={key}
                            className={cn(
                              "aspect-square rounded-md flex items-center justify-center text-sm font-medium",
                              count > 0
                                ? "bg-foreground/10 text-foreground"
                                : "border border-dashed border-muted-foreground/20 text-muted-foreground/25"
                            )}
                          >
                            {count > 0 ? count : ""}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>

                {/* Hint */}
                <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
                  {coveredCount < 6
                    ? "Add more angles and expressions for better video consistency"
                    : coveredCount < 10
                    ? "Good coverage — a few more poses would strengthen consistency"
                    : "Excellent coverage across all poses"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instagram-style grid: first cell is + add button */}
      <div className="grid grid-cols-3 gap-px">
        {/* Add button cell */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square bg-accent/20 flex flex-col items-center justify-center gap-2 hover:bg-accent/40 transition-colors duration-150"
        >
          <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-[0.625rem] text-muted-foreground uppercase tracking-widest">
            Add
          </span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Reference image cells */}
        {influencer.referenceImages.map((img) => (
          <div
            key={img.id}
            className="relative aspect-square group"
          >
            <img
              src={img.thumbnailDataUrl}
              alt=""
              className="w-full h-full object-cover"
            />

            {img.status === "pending" && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[var(--color-status-pending)] animate-pulse-dot" />
              </div>
            )}
            {img.status === "rejected" && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 p-2">
                <div className="w-3 h-3 rounded-full bg-[var(--color-status-failed)]" />
                <p className="text-white text-[0.55rem] text-center leading-tight">
                  {img.rejectionReason}
                </p>
              </div>
            )}

            {img.status === "accepted" && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col items-center justify-center gap-0.5">
                <p className="text-white text-[0.6rem] uppercase tracking-widest">
                  {img.angle}
                </p>
                <p className="text-white/70 text-[0.55rem] uppercase tracking-widest">
                  {img.expression} · {img.framing}
                </p>
                <button
                  onClick={() => removeReferenceImage(influencer.id, img.id)}
                  className="text-white/50 text-[0.55rem] hover:text-white mt-1"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
