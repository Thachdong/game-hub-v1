import { forwardToBackend } from "@/lib/proxy";

// Catch-all proxy for browser-initiated calls to authenticated backend resources
// (contracts/proxy-routes.md, research.md §4). MUST NOT be used for the dedicated auth routes
// under app/api/auth/** (login/refresh/logout/session) — those keep their own handlers.
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return forwardToBackend(request, path);
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
