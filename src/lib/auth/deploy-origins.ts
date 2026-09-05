/**
 * Hosts and origins Better Auth should accept for this app.
 *
 * Production is reached as `*.vercel.app` (and optionally `*.grok.me`). The
 * template previously trusted only `BETTER_AUTH_URL` or `*.grok-sandbox.com`,
 * so email sign-in / sign-up from https://yoan-claire-live.vercel.app returned
 * 403 `Invalid origin` and OAuth init 500'd when the request host was not on
 * the allowlist.
 *
 * Keep this module dependency-free so tests can import it without pulling `pg`.
 */

export type EnvMap = Record<string, string | undefined>;

export const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://[::1]:8081",
];

const APP_HOST_SUFFIXES = [".vercel.app", ".grok.me", ".grok-sandbox.com"] as const;

function hostnameOf(value: string): string | undefined {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

/**
 * True when this Origin is one of ours (Vercel preview/prod, Grok, or loopback).
 * Used to trust the request Origin even if a wildcard pattern in Better Auth
 * fails to match a nested `*.*.vercel.app` host.
 */
export function originLooksLikeThisApp(origin: string): boolean {
  const host = hostnameOf(origin.trim());
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
  return APP_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/** Extra origins derived from the incoming request (Host / Origin). */
export function requestTrustedOrigins(request: Request | undefined): string[] {
  if (!request) return [];
  const extra = new Set<string>();
  const origin = request.headers.get("origin")?.trim();
  if (origin && originLooksLikeThisApp(origin)) extra.add(origin.replace(/\/+$/, ""));

  const forwarded = request.headers.get("x-forwarded-host");
  const hostHeader = (forwarded || request.headers.get("host") || "").split(",")[0]?.trim();
  const host = hostHeader?.split(":")[0]?.toLowerCase();
  if (host && originLooksLikeThisApp(`https://${host}`)) extra.add(`https://${host}`);
  return [...extra];
}

const DEFAULT_HOSTS = [
  "*.grok-sandbox.com",
  "*.vercel.app",
  "*.grok.me",
  "localhost",
  "127.0.0.1",
  "[::1]",
] as const;

function read(source: EnvMap, key: string): string | undefined {
  const value = source[key]?.trim();
  return value ? value : undefined;
}

/** Hostname (or wildcard host) from a URL, host:port, or bare host. */
export function hostFromValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const raw = value.trim().replace(/\/+$/, "");
  if (!raw) return undefined;
  try {
    const url = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    return url.hostname.toLowerCase() || undefined;
  } catch {
    const host = raw.split("/")[0]?.toLowerCase();
    if (!host) return undefined;
    if (/^[a-z0-9.-]+$/.test(host) || host.startsWith("*.")) return host;
    return undefined;
  }
}

function addHost(hosts: Set<string>, value: string | undefined) {
  const host = hostFromValue(value);
  if (host) hosts.add(host);
}

/**
 * Hosts Better Auth may use when resolving a per-request base URL
 * (`x-forwarded-host` / `Host` on Vercel).
 */
export function collectAllowedHosts(source: EnvMap = process.env): string[] {
  const hosts = new Set<string>(DEFAULT_HOSTS);
  for (const key of [
    "BETTER_AUTH_URL",
    "AUTH_PUBLIC_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "VERCEL_URL",
    "VERCEL_BRANCH_URL",
  ]) {
    addHost(hosts, read(source, key));
  }
  for (const item of (read(source, "AUTH_ALLOWED_HOSTS") ?? "").split(",")) {
    addHost(hosts, item);
  }
  return [...hosts];
}

/**
 * Origins accepted on credentialed auth POSTs (sign-up, sign-in). Missing
 * production hosts here are exactly the `Invalid origin` failure.
 */
export function collectTrustedOrigins(source: EnvMap = process.env): string[] {
  const origins = new Set<string>([
    ...LOCAL_DEV_ORIGINS,
    "https://*.vercel.app",
    "https://*.grok.me",
    "https://*.grok-sandbox.com",
    "*.vercel.app",
    "*.grok.me",
    "*.grok-sandbox.com",
    "https://appleid.apple.com",
  ]);

  const explicit = read(source, "BETTER_AUTH_URL") ?? read(source, "AUTH_PUBLIC_URL");
  if (explicit) origins.add(explicit.replace(/\/+$/, ""));

  for (const host of collectAllowedHosts(source)) {
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") continue;
    origins.add(host.startsWith("*.") ? `https://${host}` : `https://${host}`);
  }

  for (const item of (read(source, "AUTH_TRUSTED_ORIGINS") ?? "").split(",")) {
    const origin = item.trim().replace(/\/+$/, "");
    if (origin) origins.add(origin);
  }

  return [...origins];
}
