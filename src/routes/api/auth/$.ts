import { createFileRoute } from "@tanstack/react-router";
import { handleAuthRequest } from "@/lib/auth/handle-request.server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuthRequest(request),
      POST: ({ request }) => handleAuthRequest(request),
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
