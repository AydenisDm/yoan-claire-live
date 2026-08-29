import { createFileRoute } from "@tanstack/react-router";

/** Kept so old cached clients don't 404. Signaling is LiveKit Cloud. */
const handle = () =>
  new Response(JSON.stringify({ ok: true, mode: "livekit" }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const Route = createFileRoute("/api/rtc")({
  server: { handlers: { GET: handle, POST: handle } },
});
