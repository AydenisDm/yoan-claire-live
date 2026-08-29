import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { eventConfig } from "@/lib/event-config";
import { HOST_IDENTITY, MAX_VIEWERS, liveRoomName } from "@/lib/live-config";

const postSchema = z.object({
  role: z.enum(["host", "guest"]),
  password: z.string().max(128).optional(),
  check: z.boolean().optional(),
  identity: z.string().max(64).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function livekitEnv() {
  const url = process.env.LIVEKIT_URL?.trim() ?? "";
  const apiKey = process.env.LIVEKIT_API_KEY?.trim() ?? "";
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim() ?? "";
  return { url, apiKey, apiSecret, ok: Boolean(url && apiKey && apiSecret) };
}

function hostPassword() {
  return process.env.HOST_PASSWORD?.trim() || eventConfig.hostPassword;
}

function httpUrl(wsUrl: string) {
  return wsUrl.replace(/^ws/i, "http");
}

async function handleGet() {
  const { ok } = livekitEnv();
  return json({ configured: ok });
}

async function handlePost(request: Request) {
  const env = livekitEnv();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "invalid" }, 400);
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "invalid" }, 400);

  const { role, password, identity: guestId, check } = parsed.data;
  if (role === "host" && password !== hostPassword()) {
    return json({ error: "unauthorized" }, 401);
  }
  if (check) {
    return json({ ok: true, configured: env.ok });
  }
  if (!env.ok) return json({ error: "not_configured", configured: false });

  const room = liveRoomName(eventConfig.roomId);
  const identity =
    role === "host"
      ? HOST_IDENTITY
      : guestId && guestId !== HOST_IDENTITY && /^g-[a-zA-Z0-9_-]{6,32}$/.test(guestId)
        ? guestId
        : `g-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

  const { AccessToken, RoomServiceClient } = await import("livekit-server-sdk");

  if (role === "host") {
    try {
      const rooms = new RoomServiceClient(httpUrl(env.url), env.apiKey, env.apiSecret);
      await rooms.createRoom({
        name: room,
        maxParticipants: MAX_VIEWERS + 4,
        emptyTimeout: 60 * 60,
        departureTimeout: 20,
      });
    } catch {
      // Room already exists.
    }
  }

  const at = new AccessToken(env.apiKey, env.apiSecret, {
    identity,
    name: role === "host" ? "Host" : "Guest",
    ttl: "12h",
  });
  at.addGrant({
    roomJoin: true,
    room,
    roomCreate: role === "host",
    canPublish: role === "host",
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: role === "host",
  });

  const token = await at.toJwt();
  return json({ token, url: env.url, identity, room });
}

async function handle(request: Request) {
  try {
    if (request.method === "GET") return await handleGet();
    if (request.method === "POST") return await handlePost(request);
    return json({ error: "method" }, 405);
  } catch (error) {
    console.error("[live] token error", error);
    return json({ error: "failed" }, 500);
  }
}

export const Route = createFileRoute("/api/live")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
