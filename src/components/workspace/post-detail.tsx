"use client";

import type { Influencer, Video } from "@/lib/types";
import { usePersonaStore } from "@/lib/store";
import { seededRandom } from "@/components/layout/right-panel";

interface PostDetailProps {
  influencer: Influencer;
  video: Video;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function PostDetail({
  influencer,
  video,
  onClose,
  onPrev,
  onNext,
}: PostDetailProps) {
  const deleteVideo = usePersonaStore((s) => s.deleteVideo);

  const rand = seededRandom(video.id);
  const views = Math.round(2000 + rand() * 15000);
  const likes = Math.round(200 + rand() * 3000);
  const comments = Math.round(10 + rand() * 400);
  const shares = Math.round(10 + rand() * 500);
  const saves = Math.round(50 + rand() * 800);
  const reach = Math.round(views * (0.6 + rand() * 0.5));
  const impressions = Math.round(views * (1.1 + rand() * 0.6));
  const followerPct = Math.round(20 + rand() * 35);
  const profileVisits = Math.round(30 + rand() * 200);
  const avgWatchTime = Math.round(video.duration * (0.4 + rand() * 0.5));

  const formatLabel = (val: string) => {
    const labels: Record<string, string> = {
      grwm: "GRWM", "day-in-my-life": "Day in My Life",
      "outfit-check": "Outfit Check", "product-review": "Product Review",
      dance: "Dance", tutorial: "Tutorial", freeform: "Freeform",
    };
    return labels[val] ?? val;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Prev/Next arrows */}
      {onPrev && (
        <button
          onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {onNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      )}

      {/* Modal content */}
      <div className="relative z-10 flex bg-background rounded-lg overflow-hidden shadow-2xl max-w-[880px] w-[90vw] max-h-[85vh]">
        {/* Left: Video preview */}
        <div
          className="w-[55%] min-h-[480px] flex-shrink-0 relative"
          style={{
            background:
              video.thumbnailGradient ||
              "linear-gradient(135deg, #e2e0dc 0%, #c8c5bf 100%)",
          }}
        >
          {/* Play icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white" className="ml-1">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>

          {/* Duration badge */}
          <span className="absolute bottom-3 right-3 text-xs bg-black/50 text-white px-2 py-0.5 rounded">
            {video.duration}s
          </span>
        </div>

        {/* Right: Post analytics */}
        <div className="w-[45%] flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
              style={{ background: influencer.avatarGradient }}
            >
              {influencer.avatarInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{influencer.name}</p>
              <p className="text-[0.6rem] text-muted-foreground">
                {formatLabel(video.template)} · {video.resolution}
              </p>
            </div>
            <button
              onClick={() => {
                deleteVideo(influencer.id, video.id);
                onClose();
              }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Delete
            </button>
          </div>

          {/* Prompt / Caption */}
          <div className="px-5 py-3 border-b border-border">
            <p className="text-sm leading-relaxed">{video.prompt}</p>
            <p className="text-[0.6rem] text-muted-foreground mt-2">
              {new Date(video.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Analytics */}
          <div className="px-5 py-4 flex-1 space-y-4">
            {/* Overview stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Views", value: views },
                { label: "Reach", value: reach },
                { label: "Impressions", value: impressions },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-lg px-3 py-2 text-center">
                  <p className="text-base font-semibold">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="text-[0.55rem] uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Engagement */}
            <div className="glass rounded-lg px-4 py-3">
              <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground mb-2">
                Engagement
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Likes", value: likes, icon: "♥" },
                  { label: "Comments", value: comments, icon: "💬" },
                  { label: "Shares", value: shares, icon: "↗" },
                  { label: "Saves", value: saves, icon: "⊞" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-sm font-semibold">
                      {stat.value.toLocaleString()}
                    </p>
                    <p className="text-[0.5rem] text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Audience breakdown */}
            <div className="glass rounded-lg px-4 py-3">
              <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground mb-2">
                Audience
              </p>
              <div className="flex gap-3 text-xs mb-2">
                <span>
                  <span className="font-medium">{followerPct}%</span>{" "}
                  <span className="text-muted-foreground">Followers</span>
                </span>
                <span>
                  <span className="font-medium">{100 - followerPct}%</span>{" "}
                  <span className="text-muted-foreground">Non-followers</span>
                </span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                <div
                  className="bg-foreground rounded-l-full"
                  style={{ width: `${followerPct}%` }}
                />
              </div>
            </div>

            {/* Performance */}
            <div className="glass rounded-lg px-4 py-3">
              <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground mb-2">
                Performance
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Avg. watch time</span>
                  <span className="font-medium">{avgWatchTime}s of {video.duration}s</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Consistency score</span>
                  <span className="font-medium">
                    {video.consistencyScore != null
                      ? `${(video.consistencyScore * 100).toFixed(0)}%`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Profile visits</span>
                  <span className="font-medium">{profileVisits}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
