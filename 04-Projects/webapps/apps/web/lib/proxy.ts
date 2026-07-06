import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, refreshSession } from "@/lib/session";

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

function unauthenticatedResponse(): Response {
  return NextResponse.json({ message: "Not signed in" }, { status: 401 });
}

/**
 * Reads the access_token cookie, attaches it as a Bearer token on an outbound call to the
 * backend, transparently refreshes and retries once on a 401, and relays the backend's response
 * verbatim. The one sanctioned raw-fetch call site in this app — see research.md §8 for why this
 * doesn't violate the service-interface-layer rule that applies everywhere else.
 */
export async function forwardToBackend(request: Request, pathSegments: string[]): Promise<Response> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;

  if (!accessToken) {
    return unauthenticatedResponse();
  }

  const targetUrl = buildTargetUrl(request, pathSegments);
  const body = BODYLESS_METHODS.has(request.method) ? undefined : await request.text();

  let backendResponse = await callBackend(targetUrl, request, body, accessToken);

  if (backendResponse.status === 401) {
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
  accessToken: string
): Promise<Response> {
  return fetch(targetUrl, {
    method: request.method,
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
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
