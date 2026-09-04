import { ensureDbReady } from "../db";
import { describeAuthError } from "./email-errors";
import { auth } from "./server";
import { getAuthSetupStatus, isAuthSessionRead } from "./status.server";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function authPath(url: URL): string {
  return url.pathname.replace(/\/+$/, "") || "/";
}

/**
 * Better Auth entry used by `/api/auth/*`.
 *
 * Awaits schema bootstrap before the first query, returns JSON (never an empty
 * 500) when the Vercel deploy has no Postgres, and exposes GET `/api/auth/status`
 * for the sign-in / register setup screen.
 */
export async function handleAuthRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (authPath(url) === "/api/auth/status") {
    return json(await getAuthSetupStatus(request));
  }

  const setup = await getAuthSetupStatus(request);
  if (!setup.ok) {
    if (isAuthSessionRead(url, request.method)) {
      if (/\/ok\/?$/.test(url.pathname)) return json({ ok: true });
      return json(null);
    }
    if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS") {
      return json({ message: setup.message, code: setup.code }, 503);
    }
  }

  try {
    await ensureDbReady();
    const response = await auth.handler(request);
    if (response.status < 500) return response;

    const raw = await response.text();
    let parsed: { message?: string; code?: string } = {};
    try {
      parsed = JSON.parse(raw) as { message?: string; code?: string };
    } catch {
      parsed = {};
    }
    const message = describeAuthError(
      parsed.message || raw || setup.message || "Could not complete that account request.",
      "Could not complete that account request.",
    );
    return json(
      { message, code: parsed.code || "AUTH_ERROR" },
      response.status,
    );
  } catch (err) {
    console.error("[auth] handler failed", err);
    const message = describeAuthError(err, setup.message || "Could not complete that account request.");
    return json({ message, code: setup.ok ? "AUTH_ERROR" : setup.code }, 500);
  }
}
