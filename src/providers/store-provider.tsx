"use client";

import { useEffect, useState } from "react";
import { usePersonaStore } from "@/lib/store";
import { api } from "@/lib/api";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [influencers, roster] = await Promise.all([
          api.influencers.list(),
          api.roster.get(),
        ]);

        const mapped = influencers.map((inf: any) => ({
          id: inf.id,
          name: inf.name,
          niche: inf.niche,
          bio: "",
          avatarGradient: inf.avatar_gradient || "",
          avatarInitial: inf.avatar_initial || inf.name.charAt(0).toUpperCase(),
          referenceImages: (inf.reference_images || []).map((r: any) => ({
            id: r.id,
            influencerId: inf.id,
            thumbnailDataUrl: "",
            thumbnailPath: r.thumbnail_path,
            angle: r.angle,
            expression: r.expression,
            framing: r.framing,
            status: r.status,
            rejectionReason: null,
            createdAt: r.created_at || new Date().toISOString(),
          })),
          videos: (inf.videos || []).map((v: any) => ({
            id: v.id,
            influencerId: inf.id,
            prompt: v.prompt,
            template: v.template,
            duration: v.duration,
            resolution: v.resolution,
            status: v.status,
            thumbnailGradient: null,
            thumbnailPath: v.thumbnail_path,
            consistencyScore: v.consistency_score,
            createdAt: v.created_at || new Date().toISOString(),
          })),
          createdAt: inf.created_at,
        }));

        usePersonaStore.setState({
          influencers: mapped,
          rosterOrder: roster.order_data || mapped.map((i: any) => ({ type: "influencer", id: i.id })),
          folders: roster.folders || [],
          activeInfluencerId: mapped.length > 0 ? mapped[0].id : null,
          activeView: "profile",
        });
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
