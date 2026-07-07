"use client";

import { useState, type ReactNode } from "react";
import { Tabs, type TabItem } from "@/components/molecules/Tabs";

const TAB_ITEMS: TabItem[] = [
  { id: "lobby", label: "Lobby" },
  { id: "tournament", label: "Tournament" },
  { id: "quick-pair", label: "Quick Pair" },
];

export function GameDashboardTemplate({
  lobby,
  tournament,
  quickPair,
  leaderboard,
}: {
  lobby: ReactNode;
  tournament: ReactNode;
  quickPair: ReactNode;
  leaderboard: ReactNode;
}) {
  const [activeId, setActiveId] = useState<string>(TAB_ITEMS[0].id);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1">
        <Tabs items={TAB_ITEMS} activeId={activeId} onChange={setActiveId} />
        <div className="mt-4">
          {activeId === "lobby" ? lobby : null}
          {activeId === "tournament" ? tournament : null}
          {activeId === "quick-pair" ? quickPair : null}
        </div>
      </div>
      <aside className="w-full shrink-0 lg:w-80">{leaderboard}</aside>
    </div>
  );
}
