import type { Metadata } from "next";
import { auth } from "@/lib/auth";
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
  // Fetched once, server-side, and seeded into the client SessionProvider so useSession()
  // hydrates with the correct status immediately — no loading flash (FR-012/SC-006, research.md §5).
  const session = await auth();

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
