"use server";

import { cookies } from "next/headers";
import {
  createMatch,
  getMatch,
  joinMatch,
  listMatchChat,
  muteMatchViewer,
  registerForTournament,
  requestDraw,
  requestQuickPair,
  respondToDrawRequest,
  sendMatchChat,
  startMatch,
  submitMove,
  surrenderMatch,
} from "@game-hub/caro-service";
import { ACCESS_COOKIE_NAME, ensureCaroServiceConfigured } from "@/lib/session";

/**
 * Server Actions are the service-interface boundary (constitution Principle IV) for every Caro
 * mutation a Client Component triggers: packages/caro-service's http client requires the
 * request's own httpOnly-cookie access token (research.md §1), which browser JS must never hold
 * (Principle VI), so these run server-side and are called directly from Client Components like
 * any other async function — no client-side fetch involved.
 */
async function withCaroService<T>(run: () => Promise<T>): Promise<T> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;
  await ensureCaroServiceConfigured(accessToken);
  return run();
}

export async function joinMatchAction(id: string) {
  return withCaroService(() => joinMatch({ id }));
}

export async function createMatchAction(input: { configId: string; visibility: "public" | "private" }) {
  return withCaroService(() => createMatch(input));
}

export async function registerForTournamentAction(tournamentId: string) {
  return withCaroService(() => registerForTournament({ tournamentId }));
}

export async function requestQuickPairAction(configId: string) {
  return withCaroService(() => requestQuickPair({ configId }));
}

// --- Gameboard (spec 008) ---------------------------------------------------

/**
 * Used to refresh full match state (including a newly-joined player's username/elo/winRate,
 * which `match:player_joined`'s payload doesn't carry) after a realtime transition event.
 */
export async function getMatchAction(id: string) {
  return withCaroService(() => getMatch({ id }));
}

export async function startMatchAction(id: string) {
  return withCaroService(() => startMatch({ id }));
}

export async function submitMoveAction(input: { id: string; row: number; col: number }) {
  return withCaroService(() => submitMove(input));
}

export async function surrenderMatchAction(id: string) {
  return withCaroService(() => surrenderMatch({ id }));
}

export async function requestDrawAction(id: string) {
  return withCaroService(() => requestDraw({ id }));
}

export async function respondToDrawRequestAction(input: { id: string; action: "accept" | "decline" }) {
  return withCaroService(() => respondToDrawRequest(input));
}

export async function listMatchChatAction(matchId: string) {
  return withCaroService(() => listMatchChat({ matchId }));
}

export async function sendMatchChatAction(input: { matchId: string; content: string }) {
  return withCaroService(() => sendMatchChat(input));
}

export async function muteMatchViewerAction(input: { matchId: string; viewerId: string }) {
  return withCaroService(() => muteMatchViewer(input));
}
