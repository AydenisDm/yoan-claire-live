export const HOST_IDENTITY = "streamer";
export const HOST_GATE_KEY = "eventview-host-ok";
export const HOST_PW_KEY = "eventview-host-pw";
export const GUEST_ID_KEY = "eventview-guest-id";
export const MAX_VIEWERS = 220;

function productionOrigin() {
  const fromEnv = (
    (typeof import.meta !== "undefined"
      ? (import.meta.env as Record<string, string | undefined>).VITE_PRODUCTION_ORIGIN
      : undefined) ?? ""
  ).trim();
  return fromEnv.replace(/\/$/, "") || "https://yoan-claire-live.vercel.app";
}

/** Existing Vercel deploy host (repo slug unchanged). Override with VITE_PRODUCTION_ORIGIN. */
export const PRODUCTION_ORIGIN = productionOrigin();
export const PRODUCTION_LIVE_API = `${PRODUCTION_ORIGIN}/api/live`;

export function liveRoomName(roomId: string) {
  const slug = roomId.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return `eventview-${slug || "live"}`;
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
