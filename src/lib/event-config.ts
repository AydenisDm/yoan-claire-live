const env = (key: string, fallback: string) => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

export const eventConfig = {
  productName: env("VITE_PRODUCT_NAME", "EventView"),
  eventName: env("VITE_EVENT_NAME", env("VITE_COUPLE_NAMES", "EventView")),
  eventDate: env("VITE_EVENT_DATE", ""),
  kicker: env("VITE_KICKER", env("VITE_VENUE_LINE", "Live")),
  playbackUrl: env("VITE_PLAYBACK_URL", ""),
  hostPassword: env("VITE_HOST_PASSWORD", "vow"),
  chatEnabled: env("VITE_CHAT_ENABLED", "true") === "true",
  roomId: env("VITE_ROOM_ID", "live"),
} as const;
