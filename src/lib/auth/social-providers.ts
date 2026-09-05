/**
 * Official Better Auth social providers for EventView (Apple, Google, X).
 *
 * Dependency-free so the client, status probe, and tests can share one contract
 * without pulling `pg` / jose / Better Auth into the browser bundle.
 *
 * Credentials never live here — only "is this provider configured?" from env
 * names. Paste real values in Vercel; do not commit them.
 */

export type EnvMap = Record<string, string | undefined>;

export type SocialId = "apple" | "google" | "twitter";

export type SocialVia = "official" | "broker";

export type SocialMethods = Record<SocialId, SocialVia | null>;

export type OfficialSocialFlags = Record<SocialId, boolean>;

export const SOCIAL_PROVIDERS: readonly {
  id: SocialId;
  label: string;
  /** Grok broker providerId, when a sandbox fallback exists. */
  brokerId?: string;
}[] = [
  { id: "apple", label: "Apple" },
  { id: "google", label: "Google", brokerId: "grok-google" },
  { id: "twitter", label: "X", brokerId: "grok-x" },
] as const;

/** Better Auth callback path for each official social provider. */
export const SOCIAL_CALLBACK_PATHS: Record<SocialId, string> = {
  apple: "/api/auth/callback/apple",
  google: "/api/auth/callback/google",
  twitter: "/api/auth/callback/twitter",
};

export const PRODUCTION_ORIGIN = "https://yoan-claire-live.vercel.app";

/** Apple posts form_post callbacks from this origin — Better Auth must trust it. */
export const APPLE_TRUSTED_ORIGIN = "https://appleid.apple.com";

/** Preview-only Grok broker client id (not a production OAuth client). */
const GROK_PREVIEW_CLIENT_ID = "grok_preview";

export function readEnv(source: EnvMap, key: string): string | undefined {
  const value = source[key]?.trim();
  return value ? value : undefined;
}

export function socialCallbackUrl(origin: string, id: SocialId): string {
  return `${origin.replace(/\/+$/, "")}${SOCIAL_CALLBACK_PATHS[id]}`;
}

export function productionCallbackUrls(): Record<SocialId, string> {
  return {
    apple: socialCallbackUrl(PRODUCTION_ORIGIN, "apple"),
    google: socialCallbackUrl(PRODUCTION_ORIGIN, "google"),
    twitter: socialCallbackUrl(PRODUCTION_ORIGIN, "twitter"),
  };
}

export function officialSocialFlags(source: EnvMap = process.env): OfficialSocialFlags {
  const appleId = readEnv(source, "APPLE_CLIENT_ID");
  const appleSecret = readEnv(source, "APPLE_CLIENT_SECRET");
  const appleParts =
    readEnv(source, "APPLE_TEAM_ID") &&
    readEnv(source, "APPLE_KEY_ID") &&
    readEnv(source, "APPLE_PRIVATE_KEY");

  const googleId = readEnv(source, "GOOGLE_CLIENT_ID") ?? readEnv(source, "GOOGLE_WEB_CLIENT_ID");
  const googleSecret = readEnv(source, "GOOGLE_CLIENT_SECRET");

  const twitterId = readEnv(source, "TWITTER_CLIENT_ID") ?? readEnv(source, "X_CLIENT_ID");
  const twitterSecret = readEnv(source, "TWITTER_CLIENT_SECRET") ?? readEnv(source, "X_CLIENT_SECRET");

  return {
    apple: Boolean(appleId && (appleSecret || appleParts)),
    google: Boolean(googleId && googleSecret),
    twitter: Boolean(twitterId && twitterSecret),
  };
}

/**
 * Grok broker Google/X — works on `*.grok-sandbox.com` with the baked preview
 * client, or on Vercel only when a real (non-preview) `GROK_AUTH_CLIENT_ID` is set.
 */
export function grokBrokerAvailable(source: EnvMap = process.env, host = ""): boolean {
  if (host.toLowerCase().endsWith(".grok-sandbox.com")) return true;
  const clientId = readEnv(source, "GROK_AUTH_CLIENT_ID");
  return Boolean(clientId && clientId !== GROK_PREVIEW_CLIENT_ID);
}

/**
 * Which backend to use for each button.
 *
 * Sandbox prefers the Grok broker for Google/X (those callbacks are already
 * registered). Vercel prefers official Apple / Google / X apps. Apple has no
 * broker path.
 */
export function resolveSocialMethods(source: EnvMap = process.env, host = ""): SocialMethods {
  const official = officialSocialFlags(source);
  const broker = grokBrokerAvailable(source, host);
  const sandbox = host.toLowerCase().endsWith(".grok-sandbox.com");
  return {
    apple: official.apple ? "official" : null,
    google: sandbox && broker ? "broker" : official.google ? "official" : broker ? "broker" : null,
    twitter: sandbox && broker ? "broker" : official.twitter ? "official" : broker ? "broker" : null,
  };
}

export function anySocialAvailable(methods: SocialMethods): boolean {
  return Object.values(methods).some(Boolean);
}

export function socialNotConfiguredMessage(id: SocialId): string {
  if (id === "apple") {
    return "Apple Sign-In is not set up on this site yet. Add APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY on Vercel (Production and Preview), then redeploy.";
  }
  if (id === "google") {
    return "Google sign-in is not set up on this site yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Vercel (Production and Preview), then redeploy.";
  }
  return "X sign-in is not set up on this site yet. Add TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET (or X_CLIENT_ID / X_CLIENT_SECRET) on Vercel (Production and Preview), then redeploy.";
}

export function brokerIdFor(id: SocialId): string | null {
  return SOCIAL_PROVIDERS.find((p) => p.id === id)?.brokerId ?? null;
}
