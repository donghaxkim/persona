"use client";

import { usePersonaStore } from "@/lib/store";
import { ProfileView } from "./profile-view";
import { UploadView } from "./upload-view";
import { CreateView } from "../create/create-view";
import { AnalyticsView } from "./analytics-view";
import { PortfolioDashboard } from "./portfolio-dashboard";

export function WorkspaceRouter() {
  const activeInfluencerId = usePersonaStore((s) => s.activeInfluencerId);
  const activeView = usePersonaStore((s) => s.activeView);
  const influencer = usePersonaStore((s) =>
    s.influencers.find((i) => i.id === s.activeInfluencerId)
  );

  if (!activeInfluencerId || !influencer) {
    return <PortfolioDashboard />;
  }

  switch (activeView) {
    case "profile":
      return <ProfileView influencer={influencer} />;
    case "references":
      return <UploadView influencer={influencer} />;
    case "create":
      return <CreateView influencer={influencer} />;
    case "analytics":
      return <AnalyticsView influencer={influencer} />;
    default:
      return <ProfileView influencer={influencer} />;
  }
}
