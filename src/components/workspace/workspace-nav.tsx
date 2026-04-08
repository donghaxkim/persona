"use client";

import { usePersonaStore } from "@/lib/store";
import type { WorkspaceView } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { value: WorkspaceView; label: string; icon: string }[] = [
  { value: "profile", label: "Posts", icon: "grid" },
  { value: "references", label: "References", icon: "refs" },
  { value: "generate", label: "Generate", icon: "plus" },
];

function TabIcon({ type }: { type: string }) {
  if (type === "grid") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="inline-block">
        <rect x="0" y="0" width="3.5" height="3.5" fill="currentColor" rx="0.5" />
        <rect x="4.25" y="0" width="3.5" height="3.5" fill="currentColor" rx="0.5" />
        <rect x="8.5" y="0" width="3.5" height="3.5" fill="currentColor" rx="0.5" />
        <rect x="0" y="4.25" width="3.5" height="3.5" fill="currentColor" rx="0.5" />
        <rect x="4.25" y="4.25" width="3.5" height="3.5" fill="currentColor" rx="0.5" />
        <rect x="8.5" y="4.25" width="3.5" height="3.5" fill="currentColor" rx="0.5" />
        <rect x="0" y="8.5" width="3.5" height="3.5" fill="currentColor" rx="0.5" />
        <rect x="4.25" y="8.5" width="3.5" height="3.5" fill="currentColor" rx="0.5" />
        <rect x="8.5" y="8.5" width="3.5" height="3.5" fill="currentColor" rx="0.5" />
      </svg>
    );
  }
  if (type === "refs") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline-block">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function WorkspaceNav() {
  const activeView = usePersonaStore((s) => s.activeView);
  const setActiveView = usePersonaStore((s) => s.setActiveView);

  return (
    <nav className="flex justify-center gap-0 border-t border-border">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => setActiveView(tab.value)}
          className={cn(
            "flex items-center gap-1.5 px-6 py-3 text-xs uppercase tracking-widest transition-colors duration-150 border-t",
            activeView === tab.value
              ? "border-foreground text-foreground -mt-px"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <TabIcon type={tab.icon} />
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
