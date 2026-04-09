"use client";

import { useState, useMemo } from "react";
import { usePersonaStore } from "@/lib/store";
import { seededRandom } from "@/components/layout/right-panel";
import { cn } from "@/lib/utils";
import type { Influencer } from "@/lib/types";

type Period = "7d" | "30d" | "90d";
type SortKey = "views" | "interactions" | "engagement" | "name" | "newest";

const PERIOD_MULTIPLIER: Record<Period, number> = {
  "7d": 0.25,
  "30d": 1.0,
  "90d": 3.0,
};

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface CreatorStats {
  id: string;
  name: string;
  niche: string;
  avatarGradient: string;
  avatarInitial: string;
  createdAt: string;
  views: number;
  reach: number;
  interactions: number;
  engagement: number;
  followers: number;
  profileVisits: number;
  likes: number;
  shares: number;
  saves: number;
}

function computeStats(influencer: Influencer, multiplier: number): CreatorStats {
  const rand = seededRandom(influencer.id);
  const readyVideos = influencer.videos.filter((v) => v.status === "ready");
  const base = Math.max(1, readyVideos.length);
  const reach = Math.round(base * (8000 + rand() * 30000) * multiplier);
  const interactions = Math.round(base * (4000 + rand() * 12000) * multiplier);
  const engagement = 2 + rand() * 6;
  const views = Math.round(base * (20000 + rand() * 80000) * multiplier);
  const followers = Math.round(base * (800 + rand() * 4000) * multiplier);
  const profileVisits = Math.round(base * (400 + rand() * 2000) * multiplier);
  const likes = Math.round(base * (3000 + rand() * 10000) * multiplier);
  const shares = Math.round(base * (200 + rand() * 2000) * multiplier);
  const saves = Math.round(base * (100 + rand() * 800) * multiplier);

  return {
    id: influencer.id,
    name: influencer.name,
    niche: influencer.niche,
    avatarGradient: influencer.avatarGradient,
    avatarInitial: influencer.avatarInitial,
    createdAt: influencer.createdAt,
    views, reach, interactions, engagement, followers, profileVisits, likes, shares, saves,
  };
}

function mockChange(seed: string, metric: string): number {
  const rand = seededRandom(seed + metric);
  rand();
  return -30 + rand() * 60;
}

export function PortfolioDashboard() {
  const influencers = usePersonaStore((s) => s.influencers);
  const setActiveInfluencer = usePersonaStore((s) => s.setActiveInfluencer);
  const setActiveView = usePersonaStore((s) => s.setActiveView);

  const [period, setPeriod] = useState<Period>("30d");
  const [sortKey, setSortKey] = useState<SortKey>("views");

  const multiplier = PERIOD_MULTIPLIER[period];

  const creatorStats = useMemo(
    () => influencers.map((inf) => computeStats(inf, multiplier)),
    [influencers, multiplier]
  );

  const totals = useMemo(() => {
    const totalViews = creatorStats.reduce((sum, c) => sum + c.views, 0);
    const totalReach = creatorStats.reduce((sum, c) => sum + c.reach, 0);
    const totalInteractions = creatorStats.reduce((sum, c) => sum + c.interactions, 0);
    const totalFollowers = creatorStats.reduce((sum, c) => sum + c.followers, 0);
    const totalProfileVisits = creatorStats.reduce((sum, c) => sum + c.profileVisits, 0);
    const totalLikes = creatorStats.reduce((sum, c) => sum + c.likes, 0);
    const totalShares = creatorStats.reduce((sum, c) => sum + c.shares, 0);
    const totalSaves = creatorStats.reduce((sum, c) => sum + c.saves, 0);
    const avgEngagement =
      totalReach > 0 ? (totalInteractions / totalReach) * 100 : 0;
    return {
      totalViews, totalReach, totalInteractions, totalFollowers,
      totalProfileVisits, totalLikes, totalShares, totalSaves, avgEngagement,
    };
  }, [creatorStats]);

  // Niche breakdown
  const nicheBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    creatorStats.forEach((c) => {
      map.set(c.niche, (map.get(c.niche) || 0) + c.views);
    });
    const total = creatorStats.reduce((s, c) => s + c.views, 0);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([niche, views]) => ({
        niche,
        views,
        pct: total > 0 ? (views / total) * 100 : 0,
      }));
  }, [creatorStats]);

  // Content type breakdown
  const contentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    const labels: Record<string, string> = {
      grwm: "GRWM", "day-in-my-life": "Day in My Life",
      "outfit-check": "Outfit Check", "product-review": "Product Review",
      dance: "Dance", tutorial: "Tutorial", freeform: "Freeform",
    };
    influencers.forEach((inf) => {
      inf.videos.filter((v) => v.status === "ready").forEach((v) => {
        const label = labels[v.template] || v.template;
        map.set(label, (map.get(label) || 0) + 1);
      });
    });
    const total = [...map.values()].reduce((s, v) => s + v, 0);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({
        type,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      }));
  }, [influencers]);

  const sortedCreators = useMemo(() => {
    const sorted = [...creatorStats];
    switch (sortKey) {
      case "views":
        sorted.sort((a, b) => b.views - a.views);
        break;
      case "interactions":
        sorted.sort((a, b) => b.interactions - a.interactions);
        break;
      case "engagement":
        sorted.sort((a, b) => b.engagement - a.engagement);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
    return sorted;
  }, [creatorStats, sortKey]);

  const handleRowClick = (id: string) => {
    setActiveInfluencer(id);
    setActiveView("analytics");
  };

  const periods: Period[] = ["7d", "30d", "90d"];
  const changeKey = influencers.map((i) => i.id).join("-") || "empty";
  const hasCreators = influencers.length > 0;

  return (
    <div className="max-w-[600px] mx-auto px-6 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last {PERIOD_LABELS[period]}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition-colors duration-150",
                period === p
                  ? "bg-foreground text-background"
                  : "glass-card hover:bg-accent/40"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Reach & engagement ─────────────────────── */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-base font-semibold tracking-tight">Reach & engagement</h2>
          <div className="text-right">
            <span className="text-2xl font-semibold tabular-nums">
              {formatNumber(totals.totalViews)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-muted-foreground">Total views</span>
          <ChangeLabel value={mockChange(changeKey, "views")} />
        </div>

        <div className="space-y-0">
          <StatRow label="Reach" value={formatNumber(totals.totalReach)} change={mockChange(changeKey, "reach")} />
          <StatRow label="Likes" value={formatNumber(totals.totalLikes)} change={mockChange(changeKey, "likes")} />
          <StatRow label="Shares" value={formatNumber(totals.totalShares)} change={mockChange(changeKey, "shares")} />
          <StatRow label="Saves" value={formatNumber(totals.totalSaves)} change={mockChange(changeKey, "saves")} />
          <StatRow label="Engagement rate" value={`${totals.avgEngagement.toFixed(1)}%`} change={mockChange(changeKey, "engagement")} last />
        </div>
      </section>

      {/* ── Profile activity ───────────────────────── */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-base font-semibold tracking-tight">Profile activity</h2>
          <div className="text-right">
            <span className="text-2xl font-semibold tabular-nums">
              {formatNumber(totals.totalProfileVisits + totals.totalFollowers)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-muted-foreground">Total activity</span>
          <ChangeLabel value={mockChange(changeKey, "profileActivity")} />
        </div>

        <div className="space-y-0">
          <StatRow label="Profile visits" value={formatNumber(totals.totalProfileVisits)} change={mockChange(changeKey, "profileVisits")} />
          <StatRow label="New followers" value={formatNumber(totals.totalFollowers)} change={mockChange(changeKey, "followers")} last />
        </div>
      </section>

      {/* ── Top niches ─────────────────────────────── */}
      {nicheBreakdown.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold tracking-tight mb-5">Top niches</h2>
          <div className="space-y-4">
            {nicheBreakdown.map((item, i) => (
              <div key={item.niche}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">{item.niche}</span>
                  <span className="text-sm font-medium tabular-nums">{item.pct.toFixed(1)}%</span>
                </div>
                <div className="h-[5px] bg-border/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.pct}%`,
                      background: i === 0
                        ? "oklch(0.55 0.12 270)"  // muted indigo
                        : "oklch(0.65 0.06 270 / 0.5)", // lighter for rest
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Content types ──────────────────────────── */}
      {contentBreakdown.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold tracking-tight mb-5">Content types</h2>
          <div className="space-y-4">
            {contentBreakdown.map((item, i) => (
              <div key={item.type}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">{item.type}</span>
                  <span className="text-sm font-medium tabular-nums">{item.pct.toFixed(1)}%</span>
                </div>
                <div className="h-[5px] bg-border/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.pct}%`,
                      background: i === 0
                        ? "oklch(0.55 0.12 270)"
                        : "oklch(0.65 0.06 270 / 0.5)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Creators ───────────────────────────────── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold tracking-tight">Creators</h2>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-xs bg-transparent border border-border rounded-md px-2 py-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="views">Views</option>
            <option value="interactions">Interactions</option>
            <option value="engagement">Engagement</option>
            <option value="name">Name (A-Z)</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {!hasCreators ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Add your first creator to see analytics
          </div>
        ) : (
          <div className="space-y-0.5">
            {sortedCreators.map((creator) => (
              <button
                key={creator.id}
                onClick={() => handleRowClick(creator.id)}
                className="w-full flex items-center gap-3 hover:bg-accent/40 transition-colors duration-150 cursor-pointer rounded-lg px-3 py-2.5 text-left"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                  style={{ background: creator.avatarGradient }}
                >
                  {creator.avatarInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{creator.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {creator.niche}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-sm font-medium tabular-nums">
                      {formatNumber(creator.views)}
                    </p>
                    <p className="text-[0.6rem] text-muted-foreground">Views</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium tabular-nums">
                      {formatNumber(creator.interactions)}
                    </p>
                    <p className="text-[0.6rem] text-muted-foreground">
                      Interactions
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium tabular-nums">
                      {creator.engagement.toFixed(1)}%
                    </p>
                    <p className="text-[0.6rem] text-muted-foreground">Eng.</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Flat row: label left, value + change right, with bottom divider
function StatRow({
  label,
  value,
  change,
  last,
}: {
  label: string;
  value: string;
  change: number;
  last?: boolean;
}) {
  return (
    <div className={cn(!last && "border-b border-border/40")}>
      <div className="flex items-center justify-between py-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tabular-nums">{value}</span>
          <ChangeLabel value={change} compact />
        </div>
      </div>
    </div>
  );
}

// Elegant % change — soft tones instead of harsh green/red
function ChangeLabel({ value, compact }: { value: number; compact?: boolean }) {
  const isPositive = value >= 0;
  const formatted = `${isPositive ? "+" : ""}${value.toFixed(1)}%`;

  return (
    <span
      className={cn(
        compact ? "text-[0.65rem]" : "text-xs",
        "font-medium tabular-nums",
      )}
      style={{
        // Soft indigo for positive, muted mauve for negative
        color: isPositive
          ? "oklch(0.55 0.12 270)"   // refined slate-indigo
          : "oklch(0.55 0.10 350)",  // soft muted rose
      }}
    >
      {formatted}
    </span>
  );
}
