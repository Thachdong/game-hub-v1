import { redirect } from "next/navigation";
import { getSessionStatus } from "@/lib/session";
import { LoginCard } from "@/components/organisms/LoginCard";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const status = await getSessionStatus();
  if (status.isSignedIn) {
    // US1 Acceptance Scenario 3: already signed in, don't show the login form again.
    redirect("/");
  }

  const { callbackUrl, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center">
      <LoginCard callbackUrl={callbackUrl} error={error} />
    </main>
  );
}
