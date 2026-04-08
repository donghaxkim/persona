"use client";

import { useEffect, useState } from "react";
import { usePersonaStore } from "@/lib/store";
import { generateSeedData } from "@/lib/seed-data";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const state = usePersonaStore.getState();
    if (state.influencers.length === 0) {
      const seed = generateSeedData();
      usePersonaStore.setState({
        influencers: seed,
        rosterOrder: seed.map((i) => ({ type: "influencer", id: i.id })),
        folders: [],
        activeInfluencerId: seed[0].id,
        activeView: "profile",
      });
    } else if (state.rosterOrder.length === 0) {
      // Migrate existing data — create roster order from influencer list
      usePersonaStore.setState({
        rosterOrder: state.influencers.map((i) => ({
          type: "influencer",
          id: i.id,
        })),
        folders: [],
      });
    }
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
