import type { ReactNode } from "react";

/** Two-column gameboard layout: the board on the left, state-dependent panel on the right (FR-001). */
export function GameboardTemplate({ board, sidePanel }: { board: ReactNode; sidePanel: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 overflow-x-auto">{board}</div>
      <aside className="w-full shrink-0 lg:w-96">{sidePanel}</aside>
    </div>
  );
}
