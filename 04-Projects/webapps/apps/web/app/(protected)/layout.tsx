import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // FR-004: a RefreshFailed session must be treated as signed-out, same as AppNav/RequireSignIn.
  if (!session || session.error) {
    const headerList = await headers();
    const currentPath = headerList.get("x-pathname") ?? "/";
    redirect(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
  }

  return <>{children}</>;
}
