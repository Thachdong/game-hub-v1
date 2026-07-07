import { cookies } from "next/headers";
import { getMatch } from "@game-hub/caro-service";
import { ACCESS_COOKIE_NAME, ensureCaroServiceConfigured } from "@/lib/session";
import { ErrorMessage } from "@/components/atoms/ErrorMessage";
import { GameboardTemplate } from "@/components/templates/GameboardTemplate";
import { GameBoard } from "@/components/organisms/GameBoard";
import { GameboardSidePanel } from "@/components/organisms/GameboardSidePanel";

// Real gameboard (spec 008). Every read here renders for anonymous visitors too (FR-012); only
// the gated actions inside GameboardSidePanel's branches redirect a signed-out/ineligible click
// to /login (FR-013/FR-014/FR-015/FR-016).
export default async function GameCaroDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;
  await ensureCaroServiceConfigured(accessToken);

  const result = await getMatch({ id: matchId });

  if (!result.ok) {
    return (
      <main className="p-8">
        <ErrorMessage>Match not found.</ErrorMessage>
      </main>
    );
  }

  const match = result.data;

  return (
    <main className="p-8">
      <GameboardTemplate
        board={
          <GameBoard
            boardSize={match.boardSize}
            moves={match.moves}
            playerXId={match.playerX?.id ?? null}
            playerOId={match.playerO?.id ?? null}
          />
        }
        sidePanel={<GameboardSidePanel match={match} />}
      />
    </main>
  );
}
