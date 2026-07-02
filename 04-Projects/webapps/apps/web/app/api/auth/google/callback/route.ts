import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";

interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  account: { id: string; email: string; username: string; avatarUrl: string };
}

const CALLBACK_COOKIE = "oauth_callback_url";

// Typed as plain Request (not NextRequest) so this handler only relies on standard Fetch API
// surface — easier to unit test, and NextRequest offers nothing extra we need here.
// See contracts/auth-callback-route.md for the full behavior contract.
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

  const body = (await backendResponse.json()) as { data: LoginResponseDto };
  const { accessToken, refreshToken, account } = body.data;

  await signIn("credentials", {
    accessToken,
    refreshToken,
    account: JSON.stringify(account),
    redirect: false,
  });

  const cookieStore = await cookies();
  const destination = cookieStore.get(CALLBACK_COOKIE)?.value || "/";
  cookieStore.delete(CALLBACK_COOKIE);

  return NextResponse.redirect(new URL(destination, request.url));
}
