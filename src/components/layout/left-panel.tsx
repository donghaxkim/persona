"use client";

import { useState, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RosterCreate } from "../roster/roster-create";
import { usePersonaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import type { Influencer, RosterItem } from "@/lib/types";

export function LeftPanel() {
  const [hovered, setHovered] = useState(false);
  const [search, setSearch] = useState("");
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const influencers = usePersonaStore((s) => s.influencers);
  const rosterOrder = usePersonaStore((s) => s.rosterOrder);
  const activeInfluencerId = usePersonaStore((s) => s.activeInfluencerId);
  const setActiveInfluencer = usePersonaStore((s) => s.setActiveInfluencer);
  const reorderRoster = usePersonaStore((s) => s.reorderRoster);

  const getInfluencer = useCallback(
    (id: string) => influencers.find((i) => i.id === id),
    [influencers]
  );

  // Build flat list from roster order — influencers only, no folders
  const flatItems: { sortId: string; influencer: Influencer }[] = [];
  const sortIds: string[] = [];
  const seen = new Set<string>();

  for (const item of rosterOrder) {
    if (item.type === "influencer") {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      const inf = getInfluencer(item.id);
      if (inf) {
        flatItems.push({ sortId: `inf-${item.id}`, influencer: inf });
        sortIds.push(`inf-${item.id}`);
      }
    }
  }

  // Add any influencers not in rosterOrder (safety net)
  for (const inf of influencers) {
    if (!seen.has(inf.id)) {
      flatItems.push({ sortId: `inf-${inf.id}`, influencer: inf });
      sortIds.push(`inf-${inf.id}`);
    }
  }

  const isSearching = search.trim().length > 0;
  const filtered = isSearching
    ? flatItems.filter(
        (item) =>
          item.influencer.name.toLowerCase().includes(search.toLowerCase()) ||
          item.influencer.niche.toLowerCase().includes(search.toLowerCase())
      )
    : flatItems;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortIds.indexOf(active.id as string);
    const newIndex = sortIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newSortIds = arrayMove(sortIds, oldIndex, newIndex);
    const newOrder: RosterItem[] = newSortIds.map((sid) => ({
      type: "influencer" as const,
      id: sid.replace("inf-", ""),
    }));
    reorderRoster(newOrder);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setHovered(true), 80);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setHovered(false);
      setSearch("");
    }, 250);
  };

  const draggedItem = dragActiveId
    ? flatItems.find((item) => item.sortId === dragActiveId)
    : null;

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "h-full flex-shrink-0 flex flex-col overflow-hidden transition-[width] duration-200 ease-out relative z-10",
        hovered ? "w-64" : "w-16"
      )}
    >
      {/* Wordmark */}
      <div className="h-14 flex items-center px-[14px] flex-shrink-0">
        <span className={cn(
          "text-lg font-medium tracking-tight text-foreground whitespace-nowrap select-none transition-opacity duration-150",
          hovered ? "opacity-100" : "opacity-0"
        )}>persona</span>
        <span className={cn(
          "text-sm font-semibold tracking-wider text-muted-foreground select-none absolute left-0 w-16 text-center transition-opacity duration-150",
          hovered ? "opacity-0" : "opacity-100"
        )}>p</span>
      </div>

      {/* Search */}
      <div className="h-10 flex items-center flex-shrink-0 px-[5px]">
        {hovered ? (
          <div className="relative w-full px-[9px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="absolute left-[21px] top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
              className="h-8 pl-8 text-xs bg-transparent border-border/50 focus-visible:border-border" />
          </div>
        ) : (
          <div className="w-[54px] flex-shrink-0 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        )}
      </div>

      {/* New influencer */}
      <div className="flex-shrink-0 px-[5px]">
        <RosterCreate expanded={hovered} onExpand={() => setHovered(true)} />
      </div>

      {/* Roster */}
      <ScrollArea className="flex-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-0.5 px-[5px]">
              {filtered.map((item) => (
                <SortableInfluencerItem
                  key={item.sortId}
                  sortId={item.sortId}
                  influencer={item.influencer}
                  isActive={item.influencer.id === activeInfluencerId}
                  hovered={hovered}
                  onClick={() => setActiveInfluencer(item.influencer.id)}
                />
              ))}
              {isSearching && filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No matches</p>
              )}
            </div>
          </SortableContext>
          <DragOverlay>
            {draggedItem && (
              <div className="flex items-center h-11 rounded-md bg-background/90 backdrop-blur-sm shadow-lg border border-border px-2">
                <div className="w-[54px] flex-shrink-0 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium"
                    style={{ background: draggedItem.influencer.avatarGradient }}>
                    {draggedItem.influencer.avatarInitial}
                  </div>
                </div>
                {hovered && <p className="text-sm font-medium truncate">{draggedItem.influencer.name}</p>}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </ScrollArea>

      {/* Bottom spacer */}
      <div className="h-4 flex-shrink-0" />
    </aside>
  );
}

// --- Sortable Influencer Item ---
function SortableInfluencerItem({
  sortId, influencer, isActive, hovered, onClick,
}: {
  sortId: string; influencer: Influencer; isActive: boolean;
  hovered: boolean; onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const refCount = influencer.referenceImages.filter((r) => r.status === "accepted").length;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}
      className={cn(
        "w-full flex items-center h-11 rounded-md transition-colors duration-150 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
        !isActive && "hover:bg-accent/50",
      )}>
      <div className="w-[54px] flex-shrink-0 flex items-center justify-center">
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium transition-shadow duration-150",
          isActive && "ring-2 ring-foreground/20 ring-offset-1 ring-offset-background"
        )} style={{ background: influencer.avatarGradient }}>
          {influencer.avatarInitial}
        </div>
      </div>
      <div className={cn(
        "flex-1 min-w-0 pr-3 flex items-center justify-between transition-opacity duration-150",
        hovered ? "opacity-100" : "opacity-0"
      )}>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate leading-tight text-left">{influencer.name}</p>
          <p className="text-[0.65rem] text-muted-foreground truncate leading-tight text-left">
            {influencer.niche}{refCount > 0 && ` · ${refCount} refs`}
          </p>
        </div>
        {influencer.referenceImages.length > 0 && (
          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 ml-2",
            refCount >= 3 ? "bg-[var(--color-status-ready)]" : "bg-[var(--color-status-pending)]"
          )} />
        )}
      </div>
    </div>
  );
}
