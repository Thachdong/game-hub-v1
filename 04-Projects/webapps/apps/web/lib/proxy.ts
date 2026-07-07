import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, refreshSession } from "@/lib/session";

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

function unauthenticatedResponse(): Response {
  return NextResponse.json({ message: "Not signed in" }, { status: 401 });
}

/**
 * Path shapes allowed to proceed with no access_token cookie, matching backend endpoints whose
 * auth guard has been removed. `null` matches any single path segment (e.g. a match ID). See
 * specs/006-caro-guest-access/contracts/proxy-auth-policy.md for the authoritative contract,
 * including the neighboring authed paths this must not accidentally loosen (method is always
 * checked alongside the path shape). The three tournament-read rows below are added per
 * specs/007-caro-game-dashboard/contracts/proxy-auth-policy-addendum.md — those backend endpoints
 * are already public; only this webapp's own allowlist stood in the way.
 */
const OPTIONAL_AUTH_ROUTES: { method: string; segments: (string | null)[] }[] = [
  { method: "GET", segments: ["caro", "matches", "lobby"] },
  { method: "GET", segments: ["caro", "matches", null] },
  { method: "POST", segments: ["caro", "matches", null, "moves"] },
  { method: "GET", segments: ["caro", "matches", null, "chat"] },
  { method: "GET", segments: ["caro", "tournaments"] },
  { method: "GET", segments: ["caro", "tournaments", null] },
  { method: "GET", segments: ["caro", "tournaments", null, "participants"] },
];

function isOptionalAuthRoute(method: string, pathSegments: string[]): boolean {
  return OPTIONAL_AUTH_ROUTES.some(
    (route) =>
      route.method === method &&
      route.segments.length === pathSegments.length &&
      route.segments.every((segment, i) => segment === null || segment === pathSegments[i])
  );
}

/**
 * Reads the access_token cookie, attaches it as a Bearer token on an outbound call to the
 * backend, transparently refreshes and retries once on a 401, and relays the backend's response
 * verbatim. The one sanctioned raw-fetch call site in this app — see research.md §8 for why this
 * doesn't violate the service-interface-layer rule that applies everywhere else.
 *
 * A small allowlist (OPTIONAL_AUTH_ROUTES above) lets specific now-public endpoints proceed with
 * no cookie at all, forwarding without an Authorization header instead of being rejected up
 * front (specs/006-caro-guest-access).
 */
export async function forwardToBackend(request: Request, pathSegments: string[]): Promise<Response> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;

  if (!accessToken && !isOptionalAuthRoute(request.method, pathSegments)) {
    return unauthenticatedResponse();
  }

  const targetUrl = buildTargetUrl(request, pathSegments);
  const body = BODYLESS_METHODS.has(request.method) ? undefined : await request.text();

  let backendResponse = await callBackend(targetUrl, request, body, accessToken);

  if (accessToken && backendResponse.status === 401) {
    const newAccessToken = await refreshSession();
    if (!newAccessToken) {
      return unauthenticatedResponse();
    }
    backendResponse = await callBackend(targetUrl, request, body, newAccessToken);
  }

  return relay(backendResponse);
}

function buildTargetUrl(request: Request, pathSegments: string[]): string {
  const search = new URL(request.url).search;
  return `${process.env.BACKEND_URL}/api/${pathSegments.join("/")}${search}`;
}

function callBackend(
  targetUrl: string,
  request: Request,
  body: string | undefined,
  accessToken: string | null
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": request.headers.get("content-type") ?? "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });
}

async function relay(backendResponse: Response): Promise<Response> {
  const responseBody = await backendResponse.text();
  return new Response(responseBody, {
    status: backendResponse.status,
    headers: {
      "Content-Type": backendResponse.headers.get("content-type") ?? "application/json",
    },
  });
}
