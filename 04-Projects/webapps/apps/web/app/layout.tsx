import type { Metadata } from "next";
import { getSessionStatus } from "@/lib/session";
import { Providers } from "@/components/templates/Providers";
import { AppNav } from "@/components/organisms/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Hub",
  description: "Game Hub webapp",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetched once, server-side, and seeded into the client Providers so useAuthSession()
  // hydrates with the correct status immediately — no loading flash (FR-012/SC-006, research.md §3).
  const session = await getSessionStatus();

  return (
    <html lang="en">
      <body>
        <Providers session={session}>
          <AppNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
