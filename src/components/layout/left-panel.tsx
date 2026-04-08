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
  type DragOverEvent,
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
import { cn, generateId } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import type { Influencer, RosterItem, RosterFolder } from "@/lib/types";

export function LeftPanel() {
  const [hovered, setHovered] = useState(false);
  const [search, setSearch] = useState("");
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const influencers = usePersonaStore((s) => s.influencers);
  const rosterOrder = usePersonaStore((s) => s.rosterOrder);
  const folders = usePersonaStore((s) => s.folders);
  const activeInfluencerId = usePersonaStore((s) => s.activeInfluencerId);
  const setActiveInfluencer = usePersonaStore((s) => s.setActiveInfluencer);
  const reorderRoster = usePersonaStore((s) => s.reorderRoster);
  const createFolder = usePersonaStore((s) => s.createFolder);
  const toggleFolder = usePersonaStore((s) => s.toggleFolder);
  const renameFolder = usePersonaStore((s) => s.renameFolder);
  const addToFolder = usePersonaStore((s) => s.addToFolder);
  const deleteFolder = usePersonaStore((s) => s.deleteFolder);

  const getInfluencer = useCallback(
    (id: string) => influencers.find((i) => i.id === id),
    [influencers]
  );

  // Build set of influencer IDs inside folders
  const inFolderIds = new Set<string>();
  for (const folder of folders) {
    for (const iid of folder.influencerIds) inFolderIds.add(iid);
  }

  // Flatten roster — dedup, skip top-level items in folders
  type FlatItem = {
    sortId: string;
    influencer: Influencer | null;
    folderId?: string;
    folder?: RosterFolder;
  };
  const flatItems: FlatItem[] = [];
  const sortIds: string[] = [];
  const seen = new Set<string>();

  for (const item of rosterOrder) {
    if (item.type === "influencer") {
      if (inFolderIds.has(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      const inf = getInfluencer(item.id);
      if (inf) {
        flatItems.push({ sortId: `inf-${item.id}`, influencer: inf });
        sortIds.push(`inf-${item.id}`);
      }
    } else {
      const folder = folders.find((f) => f.id === item.folderId);
      if (folder) {
        sortIds.push(`folder-${folder.id}`);
        flatItems.push({ sortId: `folder-${folder.id}`, influencer: null, folder });
        if (folder.expanded) {
          for (const iid of folder.influencerIds) {
            if (seen.has(iid)) continue;
            seen.add(iid);
            const inf = getInfluencer(iid);
            if (inf) {
              flatItems.push({ sortId: `inf-${iid}`, influencer: inf, folderId: folder.id });
              sortIds.push(`inf-${iid}`);
            }
          }
        }
      }
    }
  }

  const isSearching = search.trim().length > 0;
  const filtered = isSearching
    ? flatItems.filter(
        (item) =>
          item.influencer &&
          (item.influencer.name.toLowerCase().includes(search.toLowerCase()) ||
            item.influencer.niche.toLowerCase().includes(search.toLowerCase()))
      )
    : flatItems;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    if (!overId || !dragActiveId) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setHoverTargetId(null);
      return;
    }
    if (overId !== dragActiveId && overId.startsWith("inf-") && dragActiveId.startsWith("inf-")) {
      if (hoverTargetId !== overId) {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        setHoverTargetId(overId);
        hoverTimerRef.current = setTimeout(() => {
          const dragId = dragActiveId.replace("inf-", "");
          const ovId = overId.replace("inf-", "");
          createFolder(generateId(), "Group", [ovId, dragId]);
          setDragActiveId(null);
          setHoverTargetId(null);
        }, 800);
      }
    } else if (overId.startsWith("folder-") && dragActiveId.startsWith("inf-")) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setHoverTargetId(overId);
    } else {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setHoverTargetId(null);
    }
  };

  const removeFromFolder = usePersonaStore((s) => s.removeFromFolder);

  const handleDragEnd = (event: DragEndEvent) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoverTargetId(null);
    const currentDragId = dragActiveId;
    setDragActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    if (!activeId.startsWith("inf-")) return;
    const influencerId = activeId.replace("inf-", "");

    // Find which folder the dragged influencer is currently in (if any)
    const sourceFolder = folders.find((f) => f.influencerIds.includes(influencerId));

    // Dropping onto a folder header → add to that folder
    if (overId.startsWith("folder-")) {
      const targetFolderId = overId.replace("folder-", "");
      if (sourceFolder && sourceFolder.id === targetFolderId) return; // already in this folder
      // Remove from source folder first
      if (sourceFolder) removeFromFolder(sourceFolder.id, influencerId);
      addToFolder(targetFolderId, influencerId);
      return;
    }

    // Dropping onto another influencer or a different position
    if (sourceFolder) {
      // Dragging OUT of a folder to top level
      removeFromFolder(sourceFolder.id, influencerId);
      return;
    }

    // Normal top-level reorder
    const oldIndex = sortIds.indexOf(activeId);
    const newIndex = sortIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const newSortIds = arrayMove(sortIds, oldIndex, newIndex);
    const newOrder: RosterItem[] = [];
    const seenReorder = new Set<string>();
    for (const sid of newSortIds) {
      if (sid.startsWith("inf-")) {
        const iid = sid.replace("inf-", "");
        if (inFolderIds.has(iid) || seenReorder.has(iid)) continue;
        seenReorder.add(iid);
        newOrder.push({ type: "influencer", id: iid });
      } else if (sid.startsWith("folder-")) {
        const fid = sid.replace("folder-", "");
        if (!seenReorder.has(fid)) {
          seenReorder.add(fid);
          newOrder.push({ type: "folder", folderId: fid });
        }
      }
    }
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

      {/* Roster */}
      <ScrollArea className="flex-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-0.5 px-[5px]">
              {filtered.map((item) => {
                if (item.folder) {
                  return (
                    <SortableFolderItem
                      key={item.sortId}
                      sortId={item.sortId}
                      folder={item.folder}
                      hovered={hovered}
                      isDropTarget={hoverTargetId === item.sortId}
                      getInfluencer={getInfluencer}
                      activeInfluencerId={activeInfluencerId}
                      onToggle={() => toggleFolder(item.folder!.id)}
                      onRename={(name) => renameFolder(item.folder!.id, name)}
                      onDelete={() => deleteFolder(item.folder!.id)}
                      onSelectInfluencer={setActiveInfluencer}
                    />
                  );
                }
                if (!item.influencer) return null;
                return (
                  <SortableInfluencerItem
                    key={item.sortId}
                    sortId={item.sortId}
                    influencer={item.influencer}
                    isActive={item.influencer.id === activeInfluencerId}
                    isInFolder={!!item.folderId}
                    isDropTarget={hoverTargetId === item.sortId}
                    hovered={hovered}
                    onClick={() => setActiveInfluencer(item.influencer!.id)}
                  />
                );
              })}
              {isSearching && filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No matches</p>
              )}
            </div>
          </SortableContext>
          <DragOverlay>
            {draggedItem?.influencer && (
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

      {/* Create button */}
      <div className={cn("pb-4 pt-2", hovered ? "px-2" : "px-0 flex justify-center")}>
        {hovered ? (
          <div className="w-full px-[9px]"><RosterCreate /></div>
        ) : (
          <div className="w-[54px] flex items-center justify-center mx-auto">
            <button onClick={() => setHovered(true)}
              className="w-9 h-9 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:border-muted-foreground/50 transition-colors duration-150">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// --- Sortable Influencer ---
function SortableInfluencerItem({
  sortId, influencer, isActive, isInFolder, isDropTarget, hovered, onClick,
}: {
  sortId: string; influencer: Influencer; isActive: boolean; isInFolder: boolean;
  isDropTarget: boolean; hovered: boolean; onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const refCount = influencer.referenceImages.filter((r) => r.status === "accepted").length;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}
      className={cn(
        "w-full flex items-center h-11 rounded-md transition-colors duration-150 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
        isDropTarget && "ring-2 ring-foreground/30 ring-inset",
        !isActive && "hover:bg-accent/50",
        isInFolder && hovered && "pl-3"
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

// --- Sortable Folder ---
function SortableFolderItem({
  sortId, folder, hovered, isDropTarget, getInfluencer, activeInfluencerId,
  onToggle, onRename, onDelete, onSelectInfluencer,
}: {
  sortId: string; folder: RosterFolder; hovered: boolean; isDropTarget: boolean;
  getInfluencer: (id: string) => Influencer | undefined;
  activeInfluencerId: string | null;
  onToggle: () => void; onRename: (name: string) => void;
  onDelete: () => void; onSelectInfluencer: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  const folderInfluencers = folder.influencerIds
    .map((id) => getInfluencer(id))
    .filter((i): i is Influencer => !!i);

  const handleSubmitName = () => {
    if (editName.trim()) onRename(editName.trim());
    setEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Folder header — always h-11, same as influencer items */}
      <div
        {...listeners}
        onClick={onToggle}
        className={cn(
          "w-full flex items-center h-11 rounded-md transition-colors duration-150 cursor-grab active:cursor-grabbing hover:bg-accent/50",
          isDragging && "opacity-30",
          isDropTarget && "ring-2 ring-foreground/30 ring-inset bg-accent/30",
        )}
      >
        {/* Avatar area — stacked circles (collapsed) or chevron (expanded) */}
        <div className="w-[54px] flex-shrink-0 flex items-center justify-center">
          {hovered ? (
            <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={cn("text-muted-foreground transition-transform duration-150", folder.expanded && "rotate-90")}>
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </div>
          ) : (
            <div className="relative w-9 h-9">
              {folderInfluencers.slice(0, 2).map((inf, i) => (
                <div
                  key={inf.id}
                  className="absolute rounded-full flex items-center justify-center text-white font-medium border-[1.5px] border-background"
                  style={{
                    background: inf.avatarGradient,
                    width: 22,
                    height: 22,
                    fontSize: "0.45rem",
                    top: i === 0 ? 0 : 12,
                    left: i === 0 ? 0 : 14,
                    zIndex: 2 - i,
                  }}
                >
                  {inf.avatarInitial}
                </div>
              ))}
              {folderInfluencers.length > 2 && (
                <div className="absolute rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium border-[1.5px] border-background"
                  style={{ width: 16, height: 16, fontSize: "0.4rem", bottom: 0, right: 0, zIndex: 0 }}>
                  +{folderInfluencers.length - 2}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text — only visible when expanded */}
        <div className={cn(
          "flex-1 min-w-0 pr-3 flex items-center justify-between transition-opacity duration-150",
          hovered ? "opacity-100" : "opacity-0"
        )}>
          <div className="min-w-0">
            {editing ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSubmitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitName();
                  if (e.key === "Escape") setEditing(false);
                }}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium bg-transparent border-b border-foreground/30 outline-none w-full py-0.5"
                autoFocus
              />
            ) : (
              <p className="text-xs font-medium truncate text-left cursor-text"
                onDoubleClick={(e) => { e.stopPropagation(); setEditName(folder.name); setEditing(true); }}>
                {folder.name}
              </p>
            )}
            <p className="text-[0.6rem] text-muted-foreground">
              {folder.influencerIds.length} creators
            </p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-[0.55rem] text-muted-foreground hover:text-foreground transition-colors">
            Ungroup
          </button>
        </div>
      </div>

      {/* Folder children — only when expanded AND sidebar is expanded */}
      {folder.expanded && hovered && folderInfluencers.map((inf) => {
        const isActive = inf.id === activeInfluencerId;
        const refCount = inf.referenceImages.filter((r) => r.status === "accepted").length;
        return (
          <div key={inf.id} onClick={() => onSelectInfluencer(inf.id)}
            className={cn(
              "w-full flex items-center h-10 rounded-md transition-colors duration-150 cursor-pointer pl-3",
              !isActive && "hover:bg-accent/50"
            )}>
            <div className="w-[54px] flex-shrink-0 flex items-center justify-center">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-white text-[0.6rem] font-medium transition-shadow duration-150",
                isActive && "ring-2 ring-foreground/20 ring-offset-1 ring-offset-background"
              )} style={{ background: inf.avatarGradient }}>
                {inf.avatarInitial}
              </div>
            </div>
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-xs font-medium truncate leading-tight text-left">{inf.name}</p>
              <p className="text-[0.6rem] text-muted-foreground truncate leading-tight text-left">
                {inf.niche}{refCount > 0 && ` · ${refCount}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
