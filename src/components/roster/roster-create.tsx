"use client";

import { useState } from "react";
import { usePersonaStore } from "@/lib/store";
import { generateId } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface RosterCreateProps {
  onCreated?: () => void;
}

export function RosterCreate({ onCreated }: RosterCreateProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const createInfluencer = usePersonaStore((s) => s.createInfluencer);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createInfluencer(generateId(), name.trim(), niche.trim() || "General");
    setName("");
    setNiche("");
    setOpen(false);
    onCreated?.();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 px-3 rounded-md border border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-colors duration-150"
      >
        + New influencer
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 rounded-md border border-border">
      <div>
        <Label className="text-[0.625rem] uppercase tracking-widest text-muted-foreground">
          Name
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Character name"
          className="mt-1 h-8 text-sm"
          autoFocus
        />
      </div>
      <div>
        <Label className="text-[0.625rem] uppercase tracking-widest text-muted-foreground">
          Niche
        </Label>
        <Input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="Fashion, Tech, Fitness..."
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 h-8 text-sm"
        >
          Create
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setName("");
            setNiche("");
          }}
          className="h-8 text-sm text-muted-foreground"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
