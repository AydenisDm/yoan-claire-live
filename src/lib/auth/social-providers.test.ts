import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import { decodeJwt, decodeProtectedHeader } from "jose";
import {
  APPLE_TRUSTED_ORIGIN,
  PRODUCTION_ORIGIN,
  anySocialAvailable,
  officialSocialFlags,
  productionCallbackUrls,
  resolveSocialMethods,
  socialCallbackUrl,
  socialNotConfiguredMessage,
} from "./social-providers.ts";
import {
  generateAppleClientSecret,
  normalizeApplePrivateKey,
  officialTrustedProviderIds,
  buildOfficialSocialProviders,
} from "./social-providers.server.ts";

const PREVIEW_HOST = "preview.grok-sandbox.com";
const VERCEL_HOST = "yoan-claire-live.vercel.app";

describe("officialSocialFlags", () => {
  it("is off when env is empty — no invented credentials", () => {
    assert.deepEqual(officialSocialFlags({}), {
      apple: false,
      google: false,
      twitter: false,
    });
  });

  it("enables Google and X from either TWITTER_* or X_* names", () => {
    const flags = officialSocialFlags({
      GOOGLE_CLIENT_ID: "google-id",
      GOOGLE_CLIENT_SECRET: "google-secret",
      X_CLIENT_ID: "x-id",
      X_CLIENT_SECRET: "x-secret",
    });
    assert.equal(flags.google, true);
    assert.equal(flags.twitter, true);
    assert.equal(flags.apple, false);
  });

  it("enables Apple from team/key/private key or a pre-made JWT", () => {
    assert.equal(
      officialSocialFlags({
        APPLE_CLIENT_ID: "com.eventview.si",
        APPLE_TEAM_ID: "TEAMID",
        APPLE_KEY_ID: "KEYID",
        APPLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----",
      }).apple,
      true,
    );
    assert.equal(
      officialSocialFlags({
        APPLE_CLIENT_ID: "com.eventview.si",
        APPLE_CLIENT_SECRET: "header.payload.sig",
      }).apple,
      true,
    );
    assert.equal(
      officialSocialFlags({
        APPLE_CLIENT_ID: "com.eventview.si",
        APPLE_TEAM_ID: "TEAMID",
      }).apple,
      false,
    );
  });
});

describe("resolveSocialMethods", () => {
  it("uses the Grok broker for Google/X on sandbox even if official env is set", () => {
    const methods = resolveSocialMethods(
      {
        GOOGLE_CLIENT_ID: "g",
        GOOGLE_CLIENT_SECRET: "s",
        TWITTER_CLIENT_ID: "t",
        TWITTER_CLIENT_SECRET: "s",
      },
      PREVIEW_HOST,
    );
    assert.equal(methods.google, "broker");
    assert.equal(methods.twitter, "broker");
    assert.equal(methods.apple, null);
  });

  it("uses official providers on Vercel when credentials are present", () => {
    const methods = resolveSocialMethods(
      {
        GOOGLE_CLIENT_ID: "g",
        GOOGLE_CLIENT_SECRET: "s",
        APPLE_CLIENT_ID: "com.eventview.si",
        APPLE_CLIENT_SECRET: "jwt",
        TWITTER_CLIENT_ID: "t",
        TWITTER_CLIENT_SECRET: "s",
      },
      VERCEL_HOST,
    );
    assert.deepEqual(methods, {
      apple: "official",
      google: "official",
      twitter: "official",
    });
    assert.equal(anySocialAvailable(methods), true);
  });

  it("does not treat the baked preview broker client as production social", () => {
    const methods = resolveSocialMethods(
      { GROK_AUTH_CLIENT_ID: "grok_preview" },
      VERCEL_HOST,
    );
    assert.deepEqual(methods, { apple: null, google: null, twitter: null });
  });

  it("allows a real Grok broker client on Vercel as a Google/X fallback", () => {
    const methods = resolveSocialMethods(
      { GROK_AUTH_CLIENT_ID: "real-app-client" },
      VERCEL_HOST,
    );
    assert.equal(methods.google, "broker");
    assert.equal(methods.twitter, "broker");
    assert.equal(methods.apple, null);
  });
});

describe("callback URLs", () => {
  it("builds production Better Auth callback URLs", () => {
    const urls = productionCallbackUrls();
    assert.equal(urls.apple, `${PRODUCTION_ORIGIN}/api/auth/callback/apple`);
    assert.equal(urls.google, `${PRODUCTION_ORIGIN}/api/auth/callback/google`);
    assert.equal(urls.twitter, `${PRODUCTION_ORIGIN}/api/auth/callback/twitter`);
    assert.equal(
      socialCallbackUrl("https://my-preview.vercel.app/", "google"),
      "https://my-preview.vercel.app/api/auth/callback/google",
    );
    assert.equal(APPLE_TRUSTED_ORIGIN, "https://appleid.apple.com");
  });
});

describe("setup copy", () => {
  it("names the Vercel vars instead of inventing credentials", () => {
    assert.match(socialNotConfiguredMessage("apple"), /APPLE_CLIENT_ID/);
    assert.match(socialNotConfiguredMessage("google"), /GOOGLE_CLIENT_SECRET/);
    assert.match(socialNotConfiguredMessage("twitter"), /TWITTER_CLIENT_ID/);
  });
});

describe("Apple client secret JWT", () => {
  it("normalizes escaped PEM newlines from Vercel env", () => {
    const pem = normalizeApplePrivateKey(
      "-----BEGIN PRIVATE KEY-----\\nLINE\\n-----END PRIVATE KEY-----",
    );
    assert.match(pem, /BEGIN PRIVATE KEY/);
    assert.ok(pem.includes("\nLINE\n"));
    assert.ok(!pem.includes("\\n"));
  });

  it("signs a JWT Apple will accept (ES256, team iss, service-id sub)", async () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const jwt = await generateAppleClientSecret({
      clientId: "com.eventview.web",
      teamId: "TEAMID1",
      keyId: "KEYID123",
      privateKey: pem,
    });
    const header = decodeProtectedHeader(jwt);
    const claims = decodeJwt(jwt);
    assert.equal(header.alg, "ES256");
    assert.equal(header.kid, "KEYID123");
    assert.equal(claims.iss, "TEAMID1");
    assert.equal(claims.sub, "com.eventview.web");
    assert.equal(claims.aud, "https://appleid.apple.com");
  });
});

describe("buildOfficialSocialProviders", () => {
  it("omits providers when secrets are missing", () => {
    const built = buildOfficialSocialProviders({});
    assert.equal(built.apple, undefined);
    assert.equal(built.google, undefined);
    assert.equal(built.twitter, undefined);
    assert.deepEqual(officialTrustedProviderIds({}), []);
  });

  it("includes Google prompt=select_account when configured", () => {
    const built = buildOfficialSocialProviders({
      GOOGLE_CLIENT_ID: "gid",
      GOOGLE_CLIENT_SECRET: "gsecret",
    });
    const google = built.google;
    assert.ok(google && typeof google === "object");
    assert.equal(google.clientId, "gid");
    assert.equal(google.prompt, "select_account");
    assert.deepEqual(officialTrustedProviderIds({
      GOOGLE_CLIENT_ID: "gid",
      GOOGLE_CLIENT_SECRET: "gsecret",
    }), ["google"]);
  });
});
