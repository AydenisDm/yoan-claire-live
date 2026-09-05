/**
 * Server-only Android Google handoff. Mirrors the live-preview `/auth/popup`
 * pattern: start official Google OAuth in this first-party document (so the
 * Better Auth state cookie lands in Chrome Custom Tabs), then return the
 * session token to the EventView app via `eventview://oauth?token=…`.
 *
 * No native Google SDK and no Android SHA-1 client — this reuses the live
 * web Google app (`/api/auth/callback/google`).
 */
import { auth, SESSION_TOKEN_COOKIE } from "@/lib/auth/server";
import {
  androidAuthDonePath,
  androidAuthErrorPath,
  androidOAuthCallback,
  androidOAuthIntent,
  androidPackageFor,
  sanitizeAndroidScheme,
  type AndroidAuthScheme,
} from "./android-auth";

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    const raw = trimmed.slice(eq + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

function html(body: string, status = 200): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>EventView</title>
<style>
  html,body{margin:0;min-height:100%;background:#0e0f12;color:#9aa0ab;
    font:15px/1.5 Figtree,system-ui,sans-serif}
  main{min-height:100vh;display:grid;place-items:center;padding:1.5rem;text-align:center}
  p{max-width:22rem}
</style>
</head>
<body>
<main>${body}</main>
</body>
</html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

function returnToApp(scheme: AndroidAuthScheme, token: string, pkg: string): Response {
  const custom = androidOAuthCallback(scheme, token);
  const intent = androidOAuthIntent(scheme, token, pkg);
  const safeIntent = intent.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const safeCustom = custom.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="0;url=${safeIntent}" />
<title>Returning to EventView</title>
<style>
  html,body{margin:0;min-height:100%;background:#0e0f12;color:#9aa0ab;
    font:15px/1.5 Figtree,system-ui,sans-serif}
  main{min-height:100vh;display:grid;place-items:center;padding:1.5rem;text-align:center}
  a{color:#eef0f4}
</style>
</head>
<body>
<main>
  <p>Returning to EventView…</p>
  <p><a href="${safeIntent}">Open the app</a></p>
  <p><a href="${safeCustom}">Open with EventView link</a></p>
</main>
<script>
  (function () {
    var intent = ${JSON.stringify(intent)};
    var custom = ${JSON.stringify(custom)};
    try { location.replace(intent); } catch (e) {}
    setTimeout(function () {
      try { location.replace(custom); } catch (e) {}
    }, 350);
  })();
</script>
</body>
</html>`,
    {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

async function startGoogle(
  request: Request,
  callbackURL: string,
  errorCallbackURL: string,
): Promise<Response> {
  const official = await auth.api.signInSocial({
    body: {
      provider: "google",
      callbackURL,
      errorCallbackURL,
    },
    headers: request.headers,
    asResponse: true,
  });
  if (official.ok) return official;

  return auth.api.signInWithOAuth2({
    body: {
      providerId: "grok-google",
      callbackURL,
      errorCallbackURL,
    },
    headers: request.headers,
    asResponse: true,
  });
}

export async function handleAndroidAuthRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const scheme = sanitizeAndroidScheme(url.searchParams.get("scheme"));
  const pkg = androidPackageFor(scheme, url.searchParams.get("pkg"));
  const errored = url.searchParams.has("error");
  const done = url.searchParams.get("done") === "1";

  if (errored) {
    return html(
      "<p>Google sign-in did not finish. Return to EventView and try again, or use email.</p>",
    );
  }

  if (done) {
    const fromCookie = readCookie(request, SESSION_TOKEN_COOKIE);
    if (fromCookie) return returnToApp(scheme, fromCookie, pkg);
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      const token = session?.session?.token;
      if (token) return returnToApp(scheme, token, pkg);
    } catch {
      // fall through
    }
    return html(
      "<p>Google signed in, but EventView could not read the session. Close this tab and try again.</p>",
    );
  }

  const callbackURL = androidAuthDonePath(scheme, pkg);
  const errorCallbackURL = androidAuthErrorPath(scheme, pkg);
  try {
    const apiRes = await startGoogle(request, callbackURL, errorCallbackURL);
    if (!apiRes.ok) {
      const detail = await apiRes.text().catch(() => "");
      return html(
        `<p>Google sign-in could not start.${detail ? "" : " Try email, or try again in a moment."}</p>`,
        apiRes.status >= 400 ? apiRes.status : 500,
      );
    }
    const body = (await apiRes.json().catch(() => null)) as { url?: string } | null;
    const location = body?.url;
    if (!location) {
      return html("<p>Google sign-in could not start. Try email, or try again in a moment.</p>", 500);
    }
    const headers = new Headers({ location, "cache-control": "no-store" });
    for (const cookie of apiRes.headers.getSetCookie()) {
      headers.append("set-cookie", cookie);
    }
    return new Response(null, { status: 302, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_init_threw";
    console.error("[android-auth] start failed", message);
    return html("<p>Google sign-in could not start. Try email, or try again in a moment.</p>", 500);
  }
}
