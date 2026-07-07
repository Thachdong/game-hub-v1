"use client";

import { useState } from "react";
import type { StandingsPage, TournamentDetails, TournamentStatus } from "@game-hub/caro-service";
import { listTournamentParticipantsAction } from "@/lib/actions/caro";
import { useCaroRealtimeEvent } from "@/lib/useCaroRealtime";
import { TournamentTemplate } from "@/components/templates/TournamentTemplate";
import { TournamentCountdown } from "@/components/molecules/TournamentCountdown";
import { TournamentStandingsList } from "@/components/organisms/TournamentStandingsList";

interface StatusChangedPayload {
  tournamentId: string;
  status: TournamentStatus;
}

interface ParticipantUpdatedPayload {
  tournamentId: string;
  playerId: string;
  tournamentPoints?: number;
  winStreak?: number;
  action?: string;
}

/**
 * Owns the tournament page's live tournament/standings state (a Server Component page can't hold
 * React state or realtime subscriptions itself), seeded from the page's server-fetched initial
 * data and kept live via the SSE bridge (contracts/realtime-tournament-addendum.md).
 */
export function TournamentContainer({
  initialTournament,
  initialStandings,
  currentPlayerId,
}: {
  initialTournament: TournamentDetails;
  initialStandings: StandingsPage;
  currentPlayerId: string | null;
}) {
  const [tournament, setTournament] = useState(initialTournament);
  const [standings, setStandings] = useState(initialStandings);

  useCaroRealtimeEvent<StatusChangedPayload>(
    "tournament:status-changed",
    (payload) => {
      setTournament((current) => ({ ...current, status: payload.status }));
    },
    undefined,
    tournament.tournamentId
  );

  useCaroRealtimeEvent<ParticipantUpdatedPayload>(
    "tournament:participant-updated",
    (payload) => {
      setStandings((current) => {
        const hasPlayer = current.items.some((item) => item.playerId === payload.playerId);
        if (!hasPlayer) return current;
        const items = current.items
          .map((item) =>
            item.playerId === payload.playerId
              ? {
                  ...item,
                  tournamentPoints: payload.tournamentPoints ?? item.tournamentPoints,
                  winStreak: payload.winStreak ?? item.winStreak,
                }
              : item
          )
          .sort(
            (a, b) =>
              b.tournamentPoints - a.tournamentPoints ||
              (a.registeredAt < b.registeredAt ? -1 : 1)
          );
        return { ...current, items };
      });
    },
    undefined,
    tournament.tournamentId
  );

  async function handlePageChange(page: number) {
    const result = await listTournamentParticipantsAction({
      tournamentId: tournament.tournamentId,
      page,
      pageSize: standings.pageSize,
    });
    if (result.ok) setStandings(result.data);
  }

  return (
    <TournamentTemplate
      header={
        <TournamentCountdown
          status={tournament.status}
          startAt={tournament.startAt}
          endAt={tournament.endAt}
        />
      }
      standings={
        <TournamentStandingsList
          standings={standings.items}
          page={standings.page}
          pageSize={standings.pageSize}
          total={standings.total}
          currentPlayerId={currentPlayerId}
          onPageChange={handlePageChange}
        />
      }
    />
  );
}
