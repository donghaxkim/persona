"use client";

import { LeftPanel } from "./left-panel";
import { RightPanel } from "./right-panel";

export function AppShell() {
  return (
    <div className="h-full flex">
      <LeftPanel />
      <RightPanel />
    </div>
  );
}
