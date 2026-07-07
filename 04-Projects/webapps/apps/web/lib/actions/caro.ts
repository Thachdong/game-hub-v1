"use server";

import { cookies } from "next/headers";
import { createMatch, joinMatch, registerForTournament, requestQuickPair } from "@game-hub/caro-service";
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
