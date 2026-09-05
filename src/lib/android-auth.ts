/**
 * Android Custom Tabs ↔ Better Auth Google handoff.
 *
 * The debug APK opens `/android-auth?scheme=eventview-debug`. This module is
 * dependency-free so tests can cover the scheme allow-list without pulling
 * Better Auth / `pg`.
 */

export const ANDROID_AUTH_SCHEMES = ["eventview-debug", "eventview"] as const;

export type AndroidAuthScheme = (typeof ANDROID_AUTH_SCHEMES)[number];

export function sanitizeAndroidScheme(raw: string | null | undefined): AndroidAuthScheme {
  return raw === "eventview" ? "eventview" : "eventview-debug";
}

export function androidAuthStartPath(scheme: AndroidAuthScheme = "eventview-debug"): string {
  return `/android-auth?scheme=${scheme}`;
}

export function androidAuthDonePath(scheme: AndroidAuthScheme): string {
  return `/android-auth?scheme=${scheme}&done=1`;
}

export function androidAuthErrorPath(scheme: AndroidAuthScheme): string {
  return `/android-auth?scheme=${scheme}&error=1`;
}

export function androidOAuthCallback(scheme: AndroidAuthScheme, token: string): string {
  return `${scheme}://oauth?token=${encodeURIComponent(token)}`;
}
