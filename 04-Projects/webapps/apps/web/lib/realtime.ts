import { io, type Socket } from "socket.io-client";

/**
 * Opens a server-side socket.io-client connection to the backend's `/realtime` gateway
 * (contracts/realtime-bridge.md). This MUST only ever be called from server-side code (a Route
 * Handler) — the access token is read from the httpOnly cookie by the caller and passed in here,
 * never held by or exposed to browser JS (constitution Principle VI).
 *
 * Passing no token connects as the gateway's read-only "observer" role
 * (`realtime.gateway.ts`'s `handleConnection`), which is how a guest request is handled.
 */
export function connectRealtime(accessToken: string | null): Socket {
  return io(process.env.BACKEND_URL, {
    path: "/realtime",
    auth: accessToken ? { token: accessToken } : {},
    transports: ["websocket"],
  });
}
