import { dbSource, ensureDbReady, getSql, postgresUrl, vercelRuntime } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { resolveAuthSecret } from "./secret";
import {
  anySocialAvailable,
  resolveSocialMethods,
  type SocialMethods,
} from "./social-providers";
import type { AuthSetupStatus } from "./status";

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const MISSING_DB =
  "This site cannot save accounts yet. Add a Postgres DATABASE_URL (or POSTGRES_URL) and a BETTER_AUTH_SECRET in the Vercel project (Production and Preview), then redeploy.";

const DB_ERROR =
  "The account database is not reachable. Check DATABASE_URL on Vercel, confirm the auth tables exist, and redeploy.";

function socialForHost(request?: Request): {
  social: boolean;
  socialMethods: SocialMethods;
  providers: AuthSetupStatus["providers"];
} {
  const methods = resolveSocialMethods(process.env, requestHost(request));
  return {
    social: anySocialAvailable(methods),
    socialMethods: methods,
    providers: {
      apple: Boolean(methods.apple),
      google: Boolean(methods.google),
      twitter: Boolean(methods.twitter),
    },
  };
}

function requestHost(request?: Request): string {
  if (!request) return "";
  const forwarded = request.headers.get("x-forwarded-host");
  const raw = (forwarded || request.headers.get("host") || "").split(",")[0]?.trim() ?? "";
  return raw.split(":")[0]?.toLowerCase() ?? "";
}

function onVercel(): boolean {
  return Boolean(env("VERCEL") || env("VERCEL_ENV")) || vercelRuntime;
}

function hasDatabaseUrl(): boolean {
  return Boolean(postgresUrl);
}

const globalRef = globalThis as typeof globalThis & {
  __authSetupCache__?: { at: number; status: AuthSetupStatus };
};

/**
 * Cheap, cache-briefly probe used by `/api/auth/status` and the auth handler.
 * Never throws — a failed probe becomes a setup screen instead of a blank 500.
 */
function emptySocial(): Pick<AuthSetupStatus, "social" | "socialMethods" | "providers"> {
  return {
    social: false,
    socialMethods: { apple: null, google: null, twitter: null },
    providers: { apple: false, google: false, twitter: false },
  };
}

export async function getAuthSetupStatus(request?: Request): Promise<AuthSetupStatus> {
  const social = socialForHost(request);
  const secret = resolveAuthSecret(process.env, () => "probe");
  const emailPassword = emailAndPasswordEnabled && env("VITE_AUTH_ENABLED") !== "false";

  if (env("VITE_AUTH_ENABLED") === "false") {
    return {
      ok: false,
      code: "auth_disabled",
      message: "Sign-in is turned off for this deployment.",
      persist: "none",
      emailPassword: false,
      ...emptySocial(),
      secretStable: secret.stable,
    };
  }

  if (!hasDatabaseUrl() && onVercel()) {
    return {
      ok: false,
      code: "missing_database",
      message: MISSING_DB,
      persist: "none",
      emailPassword,
      ...social,
      secretStable: false,
    };
  }

  const cached = globalRef.__authSetupCache__;
  if (cached && Date.now() - cached.at < (cached.status.ok ? 15_000 : 5_000)) {
    return {
      ...cached.status,
      ...social,
      emailPassword,
      secretStable: secret.stable,
    };
  }

  try {
    await ensureDbReady();
    const sql = await getSql();
    await sql.query("select 1 as ok");
    await sql.query(`select 1 from "user" limit 1`);
    const status: AuthSetupStatus = {
      ok: true,
      code: "ready",
      message: "",
      persist: dbSource === "neon" ? "postgres" : "pglite",
      emailPassword,
      ...social,
      secretStable: secret.stable || dbSource === "pglite",
    };
    globalRef.__authSetupCache__ = { at: Date.now(), status };
    return status;
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err ?? "");
    const missing =
      /DATABASE_URL is required/i.test(raw) ||
      /pglite/i.test(raw) ||
      /relation .*user.* does not exist/i.test(raw);
    const status: AuthSetupStatus = {
      ok: false,
      code: missing ? "missing_database" : "database_error",
      message: missing ? MISSING_DB : DB_ERROR,
      persist: hasDatabaseUrl() ? "postgres" : "none",
      emailPassword,
      ...social,
      secretStable: secret.stable,
    };
    globalRef.__authSetupCache__ = { at: Date.now(), status };
    return status;
  }
}

export function isAuthSessionRead(url: URL, method: string): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  return /\/get-session\/?$/.test(url.pathname) || /\/ok\/?$/.test(url.pathname);
}
