import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginCard } from "@/components/organisms/LoginCard";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session && !session.error) {
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
