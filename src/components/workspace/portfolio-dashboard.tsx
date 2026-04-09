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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
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
}

function computeStats(influencer: Influencer, multiplier: number): CreatorStats {
  const rand = seededRandom(influencer.id);
  const readyVideos = influencer.videos.filter((v) => v.status === "ready");
  const base = Math.max(1, readyVideos.length);
  const reach = Math.round(base * (8000 + rand() * 30000) * multiplier);
  const interactions = Math.round(base * (4000 + rand() * 12000) * multiplier);
  const engagement = 2 + rand() * 6;
  const views = Math.round(base * (20000 + rand() * 80000) * multiplier);

  return {
    id: influencer.id,
    name: influencer.name,
    niche: influencer.niche,
    avatarGradient: influencer.avatarGradient,
    avatarInitial: influencer.avatarInitial,
    createdAt: influencer.createdAt,
    views,
    reach,
    interactions,
    engagement,
  };
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
    const avgEngagement =
      totalReach > 0 ? (totalInteractions / totalReach) * 100 : 0;
    return { totalViews, totalReach, totalInteractions, avgEngagement };
  }, [creatorStats]);

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

  return (
    <div className="max-w-[600px] mx-auto px-6 py-6 animate-fade-in">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium">Overview</h1>
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

      {/* Hero Block */}
      <div className="glass rounded-xl px-6 py-8 mb-6">
        <div className="text-center mb-6">
          <p className="text-4xl font-semibold">
            {formatNumber(totals.totalViews)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total views</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-semibold">
              {formatNumber(totals.totalReach)}
            </p>
            <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground mt-1">
              Total Reach
            </p>
          </div>
          <div>
            <p className="text-xl font-semibold">
              {totals.avgEngagement.toFixed(1)}%
            </p>
            <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground mt-1">
              Avg Engagement
            </p>
          </div>
          <div>
            <p className="text-xl font-semibold">
              {formatNumber(totals.totalInteractions)}
            </p>
            <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground mt-1">
              Total Interactions
            </p>
          </div>
        </div>
      </div>

      {/* Creator Table */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Creators</h2>
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

        {sortedCreators.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Add your first creator to see analytics
          </div>
        ) : (
          <div className="space-y-1">
            {sortedCreators.map((creator) => (
              <button
                key={creator.id}
                onClick={() => handleRowClick(creator.id)}
                className="w-full flex items-center gap-3 hover:bg-accent/40 transition-colors duration-150 cursor-pointer rounded-lg px-4 py-3 text-left"
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                  style={{ background: creator.avatarGradient }}
                >
                  {creator.avatarInitial}
                </div>

                {/* Name + niche */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{creator.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {creator.niche}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-sm font-medium">
                      {formatNumber(creator.views)}
                    </p>
                    <p className="text-[0.6rem] text-muted-foreground">Views</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {formatNumber(creator.interactions)}
                    </p>
                    <p className="text-[0.6rem] text-muted-foreground">
                      Interactions
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {creator.engagement.toFixed(1)}%
                    </p>
                    <p className="text-[0.6rem] text-muted-foreground">Eng.</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
