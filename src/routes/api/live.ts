import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { eventConfig } from "@/lib/event-config";
import { HOST_IDENTITY, MAX_VIEWERS, PRODUCTION_LIVE_API, liveRoomName } from "@/lib/live-config";

const postSchema = z.object({
  role: z.enum(["host", "guest"]),
  password: z.string().max(128).optional(),
  check: z.boolean().optional(),
  identity: z.string().max(64).optional(),
});

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS },
  });
}

function envVal(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function livekitEnv() {
  const url = envVal("LIVEKIT_URL");
  const apiKey = envVal("LIVEKIT_API_KEY");
  const apiSecret = envVal("LIVEKIT_API_SECRET");
  return { url, apiKey, apiSecret, ok: Boolean(url && apiKey && apiSecret) };
}

function hostPassword() {
  return envVal("HOST_PASSWORD") || eventConfig.hostPassword;
}

function httpUrl(wsUrl: string) {
  return wsUrl.replace(/^ws/i, "http");
}

async function proxyProduction(init?: RequestInit) {
  try {
    const res = await fetch(PRODUCTION_LIVE_API, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-eventstream-proxy": "1",
        ...(init?.headers ?? {}),
      },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS },
    });
  } catch {
    return null;
  }
}

async function handleGet() {
  const { ok } = livekitEnv();
  if (ok) return json({ configured: true });
  const proxied = await proxyProduction({ method: "GET" });
  if (proxied) return proxied;
  return json({ configured: false });
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
  if (role === "host") {
    let signedIn = false;
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      signedIn = Boolean(await getSessionUser());
    } catch {
      signedIn = false;
    }
    if (!signedIn && password !== hostPassword()) {
      return json({ error: "unauthorized" }, 401);
    }
  }
  if (check) {
    if (env.ok) return json({ ok: true, configured: true });
    const proxied = await proxyProduction({
      method: "POST",
      body: JSON.stringify({ role: "guest", check: true }),
    });
    if (proxied) return json({ ok: true, configured: true });
    return json({ ok: true, configured: false });
  }
  if (!env.ok) {
    const proxied = await proxyProduction({
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    if (proxied) return proxied;
    return json({ error: "not_configured", configured: false });
  }

  const room = liveRoomName(eventConfig.roomId);
  const identity =
    role === "host"
      ? HOST_IDENTITY
      : guestId && guestId !== HOST_IDENTITY && /^g-[a-zA-Z0-9_-]{6,32}$/.test(guestId)
        ? guestId
        : `g-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

  const { AccessToken, RoomServiceClient } = await import("livekit-server-sdk");
  const rooms = new RoomServiceClient(httpUrl(env.url), env.apiKey, env.apiSecret);

  if (role === "host") {
    try {
      await rooms.createRoom({
        name: room,
        maxParticipants: MAX_VIEWERS + 4,
        emptyTimeout: 60 * 60,
        departureTimeout: 20,
      });
    } catch {
      // Room already exists.
    }
  } else {
    try {
      const people = await rooms.listParticipants(room);
      if (people.length >= MAX_VIEWERS) {
        return json({ error: "room_full", configured: true }, 429);
      }
    } catch {
      // Room is not up yet — guests wait in the client.
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
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.headers.get("x-eventstream-proxy") === "1" && !livekitEnv().ok) {
      return json({ error: "not_configured", configured: false });
    }
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
