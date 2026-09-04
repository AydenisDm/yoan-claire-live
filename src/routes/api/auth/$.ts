import { createFileRoute } from "@tanstack/react-router";
import { handleAuthRequest } from "@/lib/auth/handle-request.server";

function jsonError(err: unknown): Response {
  const message =
    err instanceof Error && err.message.trim()
      ? err.message
      : "Could not complete that account request.";
  console.error("[auth] route failed", err);
  return new Response(JSON.stringify({ message, code: "AUTH_ERROR" }), {
    status: 500,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function safeAuth(request: Request): Promise<Response> {
  try {
    return await handleAuthRequest(request);
  } catch (err) {
    return jsonError(err);
  }
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => safeAuth(request),
      POST: ({ request }) => safeAuth(request),
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-methods": "GET,POST,OPTIONS",
            "access-control-allow-headers": "content-type,authorization",
            "access-control-max-age": "86400",
          },
        }),
    },
  },
});
