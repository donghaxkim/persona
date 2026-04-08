"use client";

import { usePersonaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface RosterListProps {
  onSelect?: (id: string) => void;
}

export function RosterList({ onSelect }: RosterListProps) {
  const influencers = usePersonaStore((s) => s.influencers);
  const activeId = usePersonaStore((s) => s.activeInfluencerId);
  const setActive = usePersonaStore((s) => s.setActiveInfluencer);

  if (influencers.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">No influencers yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {influencers.map((inf) => {
        const isActive = inf.id === activeId;
        const refCount = inf.referenceImages.filter(
          (r) => r.status === "accepted"
        ).length;

        return (
          <button
            key={inf.id}
            onClick={() => {
              setActive(inf.id);
              onSelect?.(inf.id);
            }}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-md transition-colors duration-150 group",
              isActive
                ? "bg-accent"
                : "hover:bg-accent/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {inf.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{inf.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {inf.niche}
                  {refCount > 0 && (
                    <span className="ml-2">{refCount} refs</span>
                  )}
                </p>
              </div>
              {inf.referenceImages.length > 0 && (
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    refCount >= 3
                      ? "bg-[var(--color-status-ready)]"
                      : "bg-[var(--color-status-pending)]"
                  )}
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
