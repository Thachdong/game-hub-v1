import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionStatus } from "@/lib/session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = await getSessionStatus();

  if (!status.isSignedIn) {
    const headerList = await headers();
    const currentPath = headerList.get("x-pathname") ?? "/";
    redirect(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
  }

  return <>{children}</>;
}
