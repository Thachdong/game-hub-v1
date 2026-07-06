"use client";

import { Button } from "@/components/atoms/Button";
import { ErrorMessage } from "@/components/atoms/ErrorMessage";

const CALLBACK_COOKIE = "oauth_callback_url";

function errorMessageFor(error?: string): string | null {
  if (!error) return null;
  // Google's own OAuth2 error codes for a declined/cancelled consent screen.
  if (error === "access_denied" || error === "declined") {
    return "You cancelled the Google sign-in. You can try again whenever you're ready.";
  }
  if (error === "oauth_failed") {
    return "Something went wrong completing sign-in. Please try again in a moment.";
  }
  return "Sign-in didn't complete. Please try again.";
}

export function LoginCard({ callbackUrl, error }: { callbackUrl?: string; error?: string }) {
  const errorMessage = errorMessageFor(error);

  function handleSignIn() {
    if (callbackUrl) {
      document.cookie = `${CALLBACK_COOKIE}=${encodeURIComponent(callbackUrl)}; Max-Age=300; Path=/; SameSite=Lax`;
    }
    window.location.href = `${process.env.NEXT_PUBLIC_GAME_HUB_API_BASE_URL}/api/auth/google`;
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border p-8">
      <h1 className="text-xl font-semibold">Sign in to Game Hub</h1>
      {errorMessage ? <ErrorMessage>{errorMessage}</ErrorMessage> : null}
      <Button onClick={handleSignIn}>Sign in with Google</Button>
    </div>
  );
}
