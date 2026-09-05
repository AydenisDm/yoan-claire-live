/**
 * Server-only Better Auth `socialProviders` for Apple, Google, and X.
 *
 * Generates Apple's client-secret JWT with `jose` (already a dependency) from
 * Team ID + Key ID + .p8 private key, matching Better Auth 1.6's documented
 * pattern. Accepts a pre-made `APPLE_CLIENT_SECRET` JWT as an alternative.
 */
import { importPKCS8, SignJWT } from "jose";
import {
  officialSocialFlags,
  readEnv,
  type EnvMap,
  type SocialId,
} from "./social-providers";

/** Apple rejects JWTs that expire more than ~6 months out. 180 days is safe. */
const APPLE_JWT_LIFETIME_SEC = 180 * 24 * 60 * 60;

export function normalizeApplePrivateKey(raw: string): string {
  let key = raw.trim().replace(/\\n/g, "\n");
  if (!key.includes("BEGIN")) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  }
  return key;
}

export async function generateAppleClientSecret(input: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}): Promise<string> {
  const key = await importPKCS8(normalizeApplePrivateKey(input.privateKey), "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: input.keyId })
    .setIssuer(input.teamId)
    .setSubject(input.clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + APPLE_JWT_LIFETIME_SEC)
    .sign(key);
}

async function resolveAppleClientSecret(source: EnvMap): Promise<string> {
  const existing = readEnv(source, "APPLE_CLIENT_SECRET");
  if (existing) return existing;
  const clientId = readEnv(source, "APPLE_CLIENT_ID");
  const teamId = readEnv(source, "APPLE_TEAM_ID");
  const keyId = readEnv(source, "APPLE_KEY_ID");
  const privateKey = readEnv(source, "APPLE_PRIVATE_KEY");
  if (!clientId || !teamId || !keyId || !privateKey) {
    throw new Error("Apple Sign-In is missing APPLE_TEAM_ID, APPLE_KEY_ID, or APPLE_PRIVATE_KEY.");
  }
  return generateAppleClientSecret({ clientId, teamId, keyId, privateKey });
}

type SocialProviderConfig = {
  clientId: string | string[];
  clientSecret: string;
  prompt?: string;
  scope?: string[];
  appBundleIdentifier?: string;
};

type OfficialSocialProviders = {
  apple?: () => Promise<SocialProviderConfig>;
  google?: SocialProviderConfig;
  twitter?: SocialProviderConfig;
};

/**
 * Only providers with both id + secret are included. Empty object is valid —
 * email/password still works, and the UI explains a missing social method.
 */
export function buildOfficialSocialProviders(source: EnvMap = process.env): OfficialSocialProviders {
  const flags = officialSocialFlags(source);
  const providers: OfficialSocialProviders = {};

  if (flags.google) {
    const clientId = readEnv(source, "GOOGLE_CLIENT_ID") ?? readEnv(source, "GOOGLE_WEB_CLIENT_ID");
    const clientSecret = readEnv(source, "GOOGLE_CLIENT_SECRET");
    if (clientId && clientSecret) {
      const extras = [
        readEnv(source, "GOOGLE_IOS_CLIENT_ID"),
        readEnv(source, "GOOGLE_ANDROID_CLIENT_ID"),
      ].filter((value): value is string => Boolean(value));
      providers.google = {
        clientId: extras.length ? [clientId, ...extras] : clientId,
        clientSecret,
        prompt: "select_account",
      };
    }
  }

  if (flags.twitter) {
    const clientId = readEnv(source, "TWITTER_CLIENT_ID") ?? readEnv(source, "X_CLIENT_ID");
    const clientSecret = readEnv(source, "TWITTER_CLIENT_SECRET") ?? readEnv(source, "X_CLIENT_SECRET");
    if (clientId && clientSecret) {
      providers.twitter = {
        clientId,
        clientSecret,
        // X API v2 email — enable "Request email from users" on the X app too.
        scope: ["users.read", "tweet.read", "offline.access", "user.email"],
      };
    }
  }

  if (flags.apple) {
    const clientId = readEnv(source, "APPLE_CLIENT_ID");
    if (clientId) {
      const bundle = readEnv(source, "APPLE_APP_BUNDLE_IDENTIFIER");
      providers.apple = async () => ({
        clientId,
        clientSecret: await resolveAppleClientSecret(source),
        ...(bundle ? { appBundleIdentifier: bundle } : {}),
      });
    }
  }

  return providers;
}

export function officialTrustedProviderIds(source: EnvMap = process.env): SocialId[] {
  const flags = officialSocialFlags(source);
  return (Object.keys(flags) as SocialId[]).filter((id) => flags[id]);
}
