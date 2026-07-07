import { ViewerListItem } from "@/components/molecules/ViewerListItem";

export interface ViewerEntry {
  id: string;
  username: string;
}

/**
 * Composes one ViewerListItem per spectator (FR-011): omitted/empty when there are none.
 * `isParticipant` is the *current* viewer's own authorization (a match participant), applied to
 * every row's control per data-model.md "ViewerListView / ViewerEntry" — not per-target.
 */
export function ViewerList({
  viewers,
  isParticipant,
  onMute,
}: {
  viewers: ViewerEntry[];
  isParticipant: boolean;
  onMute: (viewerId: string) => void;
}) {
  if (viewers.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      {viewers.map((viewer) => (
        <ViewerListItem
          key={viewer.id}
          username={viewer.username}
          isParticipant={isParticipant}
          onMute={() => onMute(viewer.id)}
        />
      ))}
    </div>
  );
}
