import { NextResponse } from "next/server";
import { getSessionStatus } from "@/lib/session";

// Client-side revalidation endpoint (contracts/auth-routes.md). Thin wrapper around
// getSessionStatus() — always 200, this is a status query, not an authorization gate.
export async function GET() {
  const status = await getSessionStatus();
  return NextResponse.json(status);
}
