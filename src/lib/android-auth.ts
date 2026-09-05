/**
 * Android Custom Tabs ↔ Better Auth Google handoff.
 *
 * The debug APK opens `/android-auth?scheme=eventview-debug&pkg=…`. This
 * module is dependency-free so tests can cover the scheme allow-list without
 * pulling Better Auth / `pg`.
 */

export const ANDROID_AUTH_SCHEMES = ["eventview-debug", "eventview"] as const;

export type AndroidAuthScheme = (typeof ANDROID_AUTH_SCHEMES)[number];

export const ANDROID_DEBUG_PACKAGE = "com.eventview.app.debug";
export const ANDROID_RELEASE_PACKAGE = "com.eventview.app";

export function sanitizeAndroidScheme(raw: string | null | undefined): AndroidAuthScheme {
  return raw === "eventview" ? "eventview" : "eventview-debug";
}

export function androidPackageFor(
  scheme: AndroidAuthScheme,
  raw?: string | null,
): string {
  if (raw === ANDROID_DEBUG_PACKAGE || raw === ANDROID_RELEASE_PACKAGE) return raw;
  return scheme === "eventview" ? ANDROID_RELEASE_PACKAGE : ANDROID_DEBUG_PACKAGE;
}

export function androidAuthStartPath(
  scheme: AndroidAuthScheme = "eventview-debug",
  pkg?: string | null,
): string {
  return `/android-auth?scheme=${scheme}&pkg=${androidPackageFor(scheme, pkg)}`;
}

export function androidAuthDonePath(scheme: AndroidAuthScheme, pkg?: string | null): string {
  return `/android-auth?scheme=${scheme}&pkg=${androidPackageFor(scheme, pkg)}&done=1`;
}

export function androidAuthErrorPath(scheme: AndroidAuthScheme, pkg?: string | null): string {
  return `/android-auth?scheme=${scheme}&pkg=${androidPackageFor(scheme, pkg)}&error=1`;
}

export function androidOAuthCallback(scheme: AndroidAuthScheme, token: string): string {
  return `${scheme}://oauth?token=${encodeURIComponent(token)}`;
}

/**
 * Chrome Custom Tabs often swallows a raw custom-scheme `location.replace`.
 * `intent://` with an explicit package is the reliable return into the APK.
 */
export function androidOAuthIntent(
  scheme: AndroidAuthScheme,
  token: string,
  pkg: string = androidPackageFor(scheme),
): string {
  const encoded = encodeURIComponent(token);
  const fallback = encodeURIComponent(androidOAuthCallback(scheme, token));
  return `intent://oauth?token=${encoded}#Intent;scheme=${scheme};package=${pkg};S.browser_fallback_url=${fallback};end`;
}
