"use client";

import type { Influencer } from "@/lib/types";
import { usePersonaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { seededRandom } from "@/components/layout/right-panel";

interface AnalyticsViewProps {
  influencer: Influencer;
}

export function AnalyticsView({ influencer }: AnalyticsViewProps) {
  const setActiveView = usePersonaStore((s) => s.setActiveView);
  const rand = seededRandom(influencer.id);
  const readyVideos = influencer.videos.filter((v) => v.status === "ready");
  const videoCount = readyVideos.length;

  const base = Math.max(1, videoCount);
  const interactions = Math.round(base * (4000 + rand() * 12000));
  const followerPct = Math.round(20 + rand() * 30);
  const nonFollowerPct = 100 - followerPct;
  const totalFollowers = Math.round(base * (800 + rand() * 4000));
  const profileVisits = Math.round(base * (400 + rand() * 2000));
  const linkTaps = Math.round(base * (10 + rand() * 60));
  const reach = Math.round(base * (8000 + rand() * 30000));
  const impressions = Math.round(reach * (1.2 + rand() * 0.8));
  const avgEngagement = (2 + rand() * 6).toFixed(1);

  const DAYS = ["M", "Tu", "W", "Th", "F", "Sa", "Su"];
  const activeDay = Math.floor(rand() * 7);
  const TIME_SLOTS = ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"];
  const hourlyData = TIME_SLOTS.map(() => Math.round(200 + rand() * 1200));
  const maxHourly = Math.max(...hourlyData);

  // Per-video performance
  const videoPerf = readyVideos.map((v) => {
    const vRand = seededRandom(v.id);
    return {
      ...v,
      views: Math.round(2000 + vRand() * 15000),
      likes: Math.round(200 + vRand() * 3000),
      shares: Math.round(10 + vRand() * 500),
    };
  });

  const formatLabel = (val: string) => {
    const labels: Record<string, string> = {
      grwm: "GRWM", "day-in-my-life": "Day in My Life",
      "outfit-check": "Outfit Check", "product-review": "Product Review",
      dance: "Dance", tutorial: "Tutorial", freeform: "Freeform",
    };
    return labels[val] ?? val;
  };

  return (
    <div className="max-w-[600px] mx-auto px-6 py-6">
      {/* Back button */}
      <button
        onClick={() => setActiveView("profile")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to profile
      </button>

      <h2 className="text-lg font-medium">Insights</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-6">Last 30 days</p>

      {/* Overview row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl glass px-4 py-3 text-center">
          <p className="text-xl font-semibold">{reach.toLocaleString()}</p>
          <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground mt-0.5">
            Reach
          </p>
        </div>
        <div className="rounded-xl glass px-4 py-3 text-center">
          <p className="text-xl font-semibold">{impressions.toLocaleString()}</p>
          <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground mt-0.5">
            Impressions
          </p>
        </div>
        <div className="rounded-xl glass px-4 py-3 text-center">
          <p className="text-xl font-semibold">{avgEngagement}%</p>
          <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground mt-0.5">
            Engagement
          </p>
        </div>
      </div>

      {/* Interactions */}
      <div className="rounded-xl glass px-5 py-4 mb-4">
        <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
          Interactions
        </p>
        <p className="text-2xl font-semibold mt-1">
          {interactions.toLocaleString()}
        </p>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-foreground" />
            <span className="text-xs">
              <span className="font-medium">{followerPct}%</span>{" "}
              <span className="text-muted-foreground">Followers</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            <span className="text-xs">
              <span className="font-medium">{nonFollowerPct}%</span>{" "}
              <span className="text-muted-foreground">Non-followers</span>
            </span>
          </div>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden mt-2 bg-muted">
          <div
            className="bg-foreground rounded-l-full"
            style={{ width: `${followerPct}%` }}
          />
        </div>
      </div>

      {/* Profile & Followers side by side */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Profile activity */}
        <div className="rounded-xl glass px-4 py-4">
          <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
            Profile
          </p>
          <p className="text-xl font-semibold mt-1">
            {(profileVisits + linkTaps).toLocaleString()}
          </p>
          <p className="text-[0.6rem] text-muted-foreground">Profile activity</p>
          <div className="mt-4 space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Profile visits</span>
              <span className="font-medium">{profileVisits.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">External link taps</span>
              <span className="font-medium">{linkTaps.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Followers */}
        <div className="rounded-xl glass px-4 py-4">
          <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
            Followers
          </p>
          <p className="text-xl font-semibold mt-1">
            {totalFollowers.toLocaleString()}
          </p>
          <p className="text-[0.6rem] text-muted-foreground">Total followers</p>

          <p className="text-[0.6rem] font-medium mt-4 mb-2">Most active times</p>
          <div className="flex gap-1">
            {DAYS.map((d, i) => (
              <span
                key={d}
                className={cn(
                  "w-6 h-6 rounded-full text-[0.55rem] flex items-center justify-center",
                  i === activeDay
                    ? "bg-foreground text-background font-medium"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {d}
              </span>
            ))}
          </div>

          <div className="mt-3 space-y-1.5">
            {TIME_SLOTS.map((slot, i) => (
              <div key={slot} className="flex items-center gap-2">
                <span className="text-[0.55rem] text-muted-foreground w-6 text-right shrink-0">
                  {slot}
                </span>
                <div className="flex-1 h-[6px] bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground/70 rounded-full"
                    style={{ width: `${(hourlyData[i] / maxHourly) * 100}%` }}
                  />
                </div>
                <span className="text-[0.55rem] text-muted-foreground w-8 text-right shrink-0">
                  {hourlyData[i].toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top performing content */}
      {videoPerf.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3">Top content</p>
          <div className="space-y-2">
            {videoPerf
              .sort((a, b) => b.views - a.views)
              .map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-accent/20 px-4 py-3"
                >
                  <div
                    className="w-12 h-12 rounded-md flex-shrink-0"
                    style={{
                      background:
                        v.thumbnailGradient ||
                        "linear-gradient(135deg, #e2e0dc 0%, #c8c5bf 100%)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{v.prompt}</p>
                    <p className="text-[0.6rem] text-muted-foreground">
                      {formatLabel(v.template)} · {v.duration}s
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">
                      {v.views.toLocaleString()}
                    </p>
                    <p className="text-[0.55rem] text-muted-foreground">
                      {v.likes.toLocaleString()} likes · {v.shares.toLocaleString()} shares
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
