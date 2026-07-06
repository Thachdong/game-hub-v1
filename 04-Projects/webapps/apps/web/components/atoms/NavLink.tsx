import Link from "next/link";
import type { ReactNode } from "react";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-gray-700 hover:text-gray-900">
      {children}
    </Link>
  );
}
