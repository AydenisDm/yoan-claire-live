export const HOST_IDENTITY = "streamer";
export const HOST_GATE_KEY = "vows-host-ok";
export const HOST_PW_KEY = "vows-host-pw";
export const GUEST_ID_KEY = "vows-guest-id";
export const MAX_VIEWERS = 220;
export const PRODUCTION_LIVE_API = "https://yoan-claire-live.vercel.app/api/live";

export function liveRoomName(roomId: string) {
  const slug = roomId.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return `vows-${slug || "ceremony"}`;
}

export function guestIdentity() {
  if (typeof sessionStorage === "undefined") {
    return `g-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  let id = sessionStorage.getItem(GUEST_ID_KEY);
  if (!id || !/^g-[a-zA-Z0-9_-]{6,32}$/.test(id)) {
    id = `g-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    sessionStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}
