"use client";

import { useState, type ReactNode } from "react";
import { WorkspaceNav } from "../workspace/workspace-nav";
import { WorkspaceRouter } from "../workspace/workspace-router";
import { UploadView } from "../workspace/upload-view";
import { CreateView } from "../create/create-view";
import { PostDetail } from "../workspace/post-detail";
import { usePersonaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// Each view gets its own scroll container, stacked absolutely.
// Only the active one is visible. Scroll position is preserved per-view.
function ScrollSlot({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-y-auto",
        visible ? "z-[1]" : "z-0 invisible"
      )}
      aria-hidden={!visible}
    >
      {children}
    </div>
  );
}

export function RightPanel() {
  const activeInfluencerId = usePersonaStore((s) => s.activeInfluencerId);
  const activeView = usePersonaStore((s) => s.activeView);
  const influencer = usePersonaStore((s) =>
    s.influencers.find((i) => i.id === s.activeInfluencerId)
  );

  if (!activeInfluencerId || !influencer) {
    return (
      <main className="flex-1 flex flex-col min-w-0 h-full">
        <div className="flex-1 overflow-y-auto">
          <WorkspaceRouter />
        </div>
      </main>
    );
  }

  // Analytics view — full page with back button, no persistent header
  if (activeView === "analytics") {
    return (
      <main className="flex-1 flex flex-col min-w-0 h-full">
        <div className="flex-1 overflow-y-auto">
          <WorkspaceRouter />
        </div>
      </main>
    );
  }

  // All other views — fixed header + nav, each view has its own scroll
  return (
    <main className="flex-1 flex flex-col min-w-0 h-full">
      {/* Fixed header + nav — never scrolls, never shifts */}
      <div className="flex-shrink-0">
        <div className="max-w-[600px] mx-auto">
          <ProfileHeader influencer={influencer} />
          <WorkspaceNav />
        </div>
      </div>
      {/* Content area — each view is its own scroll container */}
      <div className="flex-1 min-h-0 relative">
        <ScrollSlot visible={activeView === "profile"}>
          <WorkspaceGridOnly influencer={influencer} />
        </ScrollSlot>
        <ScrollSlot visible={activeView === "references"}>
          <UploadView influencer={influencer} />
        </ScrollSlot>
        <ScrollSlot visible={activeView === "create"}>
          <CreateView influencer={influencer} />
        </ScrollSlot>
      </div>
    </main>
  );
}

// Full profile header for the Posts tab
import type { Influencer } from "@/lib/types";

function ProfileHeader({ influencer }: { influencer: Influencer }) {
  const setActiveView = usePersonaStore((s) => s.setActiveView);
  const acceptedRefs = influencer.referenceImages.filter(
    (r) => r.status === "accepted"
  );

  return (
    <div className="px-6 pt-8 pb-4">
      <div className="flex items-start gap-8">
        <div
          className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center text-white text-2xl font-medium ring-2 ring-border ring-offset-2 ring-offset-background"
          style={{ background: influencer.avatarGradient }}
        >
          {influencer.avatarInitial}
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <h2 className="text-lg font-medium leading-tight">
            {influencer.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {influencer.niche}
          </p>
          <div className="flex gap-5 mt-3">
            <div className="text-sm">
              <span className="font-semibold">{influencer.videos.length}</span>{" "}
              <span className="text-muted-foreground">posts</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">{acceptedRefs.length}</span>{" "}
              <span className="text-muted-foreground">references</span>
            </div>
          </div>
        </div>
      </div>
      {/* Professional dashboard card */}
      <DashboardCard influencer={influencer} />
    </div>
  );
}

// Grid-only portion of the profile view (videos grid without the header)
function WorkspaceGridOnly({ influencer }: { influencer: Influencer }) {
  const setActiveView = usePersonaStore((s) => s.setActiveView);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const readyVideos = influencer.videos.filter((v) => v.status === "ready");
  const selectedVideo = readyVideos.find((v) => v.id === selectedVideoId);
  const selectedIdx = readyVideos.findIndex((v) => v.id === selectedVideoId);

  if (readyVideos.length === 0) {
    return (
      <div className="max-w-[600px] mx-auto py-16 text-center">
        <p className="text-sm text-muted-foreground">No posts yet</p>
        <button
          onClick={() => setActiveView("create")}
          className="text-sm underline underline-offset-2 text-foreground mt-1 hover:opacity-70 transition-opacity duration-150"
        >
          Generate your first video →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto">
      {/* Post detail overlay */}
      {selectedVideo && (
        <PostDetail
          influencer={influencer}
          video={selectedVideo}
          onClose={() => setSelectedVideoId(null)}
          onPrev={
            selectedIdx > 0
              ? () => setSelectedVideoId(readyVideos[selectedIdx - 1].id)
              : undefined
          }
          onNext={
            selectedIdx < readyVideos.length - 1
              ? () => setSelectedVideoId(readyVideos[selectedIdx + 1].id)
              : undefined
          }
        />
      )}

      <div className="grid grid-cols-3 gap-px">
        {readyVideos.map((video) => (
          <div
            key={video.id}
            onClick={() => setSelectedVideoId(video.id)}
            className="relative aspect-square group cursor-pointer"
            style={{
              background:
                video.thumbnailGradient ||
                "linear-gradient(135deg, #e2e0dc 0%, #c8c5bf 100%)",
            }}
          >
            <span className="absolute top-2 right-2 text-[0.6rem] bg-black/50 text-white px-1 py-0.5 rounded">
              {video.duration}s
            </span>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col items-center justify-center gap-1 p-3">
              {/* Play icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="mb-1">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple "Professional dashboard" card — like Instagram's
function DashboardCard({ influencer }: { influencer: Influencer }) {
  const setActiveView = usePersonaStore((s) => s.setActiveView);
  const readyVideos = influencer.videos.filter((v) => v.status === "ready");
  const rand = seededRandom(influencer.id);
  const base = Math.max(1, readyVideos.length);
  const totalViews = Math.round(base * (20000 + rand() * 80000));

  const viewsLabel =
    totalViews >= 1000
      ? `${(totalViews / 1000).toFixed(1)}K`
      : totalViews.toLocaleString();

  return (
    <button
      onClick={() => setActiveView("analytics")}
      className="mt-4 w-full rounded-xl glass px-5 py-3 text-left hover:bg-white/60 transition-all duration-150 group"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Professional dashboard</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {readyVideos.length > 0
              ? `${viewsLabel} views in the last 30 days.`
              : "Analytics will appear after generating videos."}
          </p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted-foreground group-hover:text-foreground transition-colors duration-150"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  );
}

// Seeded random for deterministic mock analytics per influencer
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
}

export { seededRandom };
