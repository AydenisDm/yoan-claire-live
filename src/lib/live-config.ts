export const HOST_IDENTITY = "streamer";
export const HOST_GATE_KEY = "eventview-host-ok";
export const GUEST_ID_KEY = "eventview-guest-id";
export const MAX_VIEWERS = 220;
export const LIVE_PROXY_HEADER = "x-eventview-proxy";

function productionOrigin() {
  const env =
    typeof import.meta !== "undefined"
      ? (import.meta as { env?: Record<string, string | undefined> }).env
      : undefined;
  const fromEnv = env?.VITE_PRODUCTION_ORIGIN?.trim() ?? "";
  return fromEnv.replace(/\/$/, "") || "https://yoan-claire-live.vercel.app";
}

/** Existing Vercel deploy host (repo slug unchanged). Override with VITE_PRODUCTION_ORIGIN. */
export const PRODUCTION_ORIGIN = productionOrigin();
export const PRODUCTION_LIVE_API = `${PRODUCTION_ORIGIN}/api/live`;

export function liveRoomName(roomId: string) {
  const slug = roomId.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return `eventview-${slug || "live"}`;
}

/**
 * Host LiveKit tokens require a verified Better Auth session.
 * A client-supplied password is never enough — including the old default "vow".
 */
export function hostMayGoLive(signedIn: boolean) {
  return signedIn;
}

/**
 * Server-only `HOST_PASSWORD` has no shipped default and is not read from
 * `VITE_*`. It does not grant host tokens by itself; see `authorizeHostToken`.
 */
export function resolveHostPassword(
  env: Record<string, string | undefined> = process.env,
) {
  return env.HOST_PASSWORD?.trim() ?? "";
}

/**
 * Authorize a host token mint.
 * Signed-in session is required. Password is ignored so a leftover
 * `HOST_PASSWORD` env var cannot lock out a real host, and `vow` cannot
 * mint a token without a session.
 */
export function authorizeHostToken(input: {
  signedIn: boolean;
  password?: string;
  expectedPassword?: string;
}) {
  return hostMayGoLive(input.signedIn);
}

export function guestIdentity() {
  if (typeof sessionStorage === "undefined") {
    return `g-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  let id = sessionStorage.getItem(GUEST_ID_KEY);
  if (!id || !/^g-[a-z0-9_-]{6,32}$/i.test(id)) {
    id = `g-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    sessionStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}
