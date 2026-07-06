import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { setAuthCookies, type LoginResult } from "@/lib/session";

const CALLBACK_COOKIE = "oauth_callback_url";

// Typed as plain Request (not NextRequest) so this handler only relies on standard Fetch API
// surface — easier to unit test, and NextRequest offers nothing extra we need here.
// See contracts/auth-routes.md for the full behavior contract. This is the webapp's single
// Principle-VI login entry point (research.md §1) — the only code path that calls the backend's
// login-completing API.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");

  // Google itself redirected back with an error (user declined/cancelled consent) instead of a
  // code — this is FR-011's "declined/cancelled" branch, distinct from a backend failure below.
  if (!code && googleError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(googleError)}`, request.url)
    );
  }

  const backendUrl = new URL("/api/auth/google/callback", process.env.BACKEND_URL);
  if (code) backendUrl.searchParams.set("code", code);
  if (state) backendUrl.searchParams.set("state", state);

  const backendResponse = await fetch(backendUrl, { method: "GET" });

  if (!backendResponse.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  const body = (await backendResponse.json()) as { data: LoginResult };
  await setAuthCookies(body.data);

  const cookieStore = await cookies();
  const destination = cookieStore.get(CALLBACK_COOKIE)?.value || "/";
  cookieStore.delete(CALLBACK_COOKIE);

  return NextResponse.redirect(new URL(destination, request.url));
}
