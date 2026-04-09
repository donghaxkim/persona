"use client";

import { useState, useRef, useEffect } from "react";
import { usePersonaStore } from "@/lib/store";
import { generateId, cn } from "@/lib/utils";
import { NICHE_OPTIONS } from "@/lib/constants";

interface RosterCreateProps {
  expanded: boolean;
  onExpand: () => void;
}

export function RosterCreate({ expanded, onExpand }: RosterCreateProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const createInfluencer = usePersonaStore((s) => s.createInfluencer);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleOpen = () => {
    if (!expanded) onExpand();
    setOpen(true);
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    createInfluencer(generateId(), name.trim(), niche.trim() || "General");
    setName("");
    setNiche("");
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
    setName("");
    setNiche("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreate();
    if (e.key === "Escape") handleCancel();
  };

  // Collapsed — plain + icon, no circle
  if (!expanded) {
    return (
      <div className="flex items-center justify-center h-11">
        <button
          onClick={handleOpen}
          className="w-9 h-9 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors duration-400"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    );
  }

  // Expanded, not creating — + with label
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="w-full h-11 flex items-center px-2 rounded-md hover:bg-accent/50 transition-all duration-400 group"
      >
        <div className="w-[54px] flex-shrink-0 flex items-center justify-center text-muted-foreground/40 group-hover:text-muted-foreground transition-colors duration-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span className="text-sm text-muted-foreground/50 group-hover:text-muted-foreground transition-colors duration-400">
          New persona
        </span>
      </button>
    );
  }

  // Inline creation form
  return (
    <div className="px-[14px] animate-fade-in">
      <div className="glass-panel rounded-xl p-3 space-y-2.5">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Name"
          className="w-full h-8 rounded-lg bg-foreground/[0.03] border border-border/50 px-3 text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all duration-400"
        />

        <div className="flex flex-wrap gap-1">
          {NICHE_OPTIONS.slice(0, 6).map((n) => (
            <button
              key={n}
              onClick={() => setNiche(niche === n ? "" : n)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[0.6rem] transition-all duration-400",
                niche === n
                  ? "bg-foreground text-background"
                  : "bg-foreground/[0.04] text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className={cn(
              "flex-1 h-7 rounded-lg text-xs font-medium transition-all duration-400",
              name.trim()
                ? "bg-foreground text-background hover:opacity-90"
                : "bg-foreground/5 text-muted-foreground/30"
            )}
          >
            Create
          </button>
          <button
            onClick={handleCancel}
            className="h-7 px-3 rounded-lg text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
