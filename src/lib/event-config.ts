const env = (key: string, fallback: string) => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

export const eventConfig = {
  coupleNames: env("VITE_COUPLE_NAMES", "Yoan & Claire"),
  eventDate: env("VITE_EVENT_DATE", "Saturday, 29 August 2026"),
  venueLine: env("VITE_VENUE_LINE", "The wedding of"),
  playbackUrl: env("VITE_PLAYBACK_URL", ""),
  hostPassword: env("VITE_HOST_PASSWORD", "vow"),
  chatEnabled: env("VITE_CHAT_ENABLED", "false") === "true",
  roomId: env("VITE_ROOM_ID", "ceremony"),
} as const;
