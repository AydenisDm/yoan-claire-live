import { createFileRoute } from "@tanstack/react-router";

/** Kept so old cached clients don't 404. Signaling is PeerJS, no database. */
const handle = () =>
  new Response(JSON.stringify({ ok: true, mode: "peerjs" }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const Route = createFileRoute("/api/rtc")({
  server: { handlers: { GET: handle, POST: handle } },
});
