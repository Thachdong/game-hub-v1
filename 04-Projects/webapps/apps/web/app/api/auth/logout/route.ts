import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/session";

// Clears both auth cookies. No backend call — the backend issues stateless JWTs with no
// server-side session store to invalidate (research.md §7).
export async function POST() {
  await clearAuthCookies();
  return NextResponse.json({ isSignedIn: false });
}
