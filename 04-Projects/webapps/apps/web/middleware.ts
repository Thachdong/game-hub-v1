import { NextResponse, type NextRequest } from "next/server";

// This middleware does NOT implement auth/route-protection logic — that decision stays in
// (protected)/layout.tsx per research.md §4. Its only job is forwarding the current pathname via
// a request header, since Next.js Server Components (layouts included) have no built-in way to
// read the current path — only Client Components get `usePathname()`. `(protected)/layout.tsx`
// reads this header to build FR-007's `callbackUrl=<path>` redirect target.
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
