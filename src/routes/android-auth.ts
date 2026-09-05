import { createFileRoute } from "@tanstack/react-router";
import { handleAndroidAuthRequest } from "@/lib/android-auth.server";

export const Route = createFileRoute("/android-auth")({
  server: {
    handlers: {
      GET: ({ request }) => handleAndroidAuthRequest(request),
      HEAD: () =>
        new Response(null, {
          status: 204,
          headers: { "cache-control": "no-store" },
        }),
    },
  },
});
