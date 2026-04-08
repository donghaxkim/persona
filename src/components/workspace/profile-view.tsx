"use client";

// ProfileView is now handled directly by RightPanel's WorkspaceGridOnly component
// This file exists only as a fallback / re-export for the router

import type { Influencer } from "@/lib/types";

interface ProfileViewProps {
  influencer: Influencer;
}

// This shouldn't render in normal flow — the right panel handles profile view directly
export function ProfileView({ influencer }: ProfileViewProps) {
  return null;
}
