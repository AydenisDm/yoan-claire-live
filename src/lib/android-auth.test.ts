import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANDROID_DEBUG_PACKAGE,
  ANDROID_RELEASE_PACKAGE,
  androidAuthDonePath,
  androidAuthErrorPath,
  androidAuthStartPath,
  androidOAuthCallback,
  androidOAuthIntent,
  androidPackageFor,
  sanitizeAndroidScheme,
} from "./android-auth.ts";

describe("sanitizeAndroidScheme", () => {
  it("allows only the EventView app schemes", () => {
    assert.equal(sanitizeAndroidScheme("eventview"), "eventview");
    assert.equal(sanitizeAndroidScheme("eventview-debug"), "eventview-debug");
    assert.equal(sanitizeAndroidScheme("https"), "eventview-debug");
    assert.equal(sanitizeAndroidScheme(null), "eventview-debug");
  });
});

describe("android auth paths", () => {
  it("builds start / done / error URLs the APK expects", () => {
    assert.equal(
      androidAuthStartPath(),
      "/android-auth?scheme=eventview-debug&pkg=com.eventview.app.debug",
    );
    assert.equal(
      androidAuthDonePath("eventview-debug"),
      "/android-auth?scheme=eventview-debug&pkg=com.eventview.app.debug&done=1",
    );
    assert.equal(
      androidAuthErrorPath("eventview"),
      "/android-auth?scheme=eventview&pkg=com.eventview.app&error=1",
    );
  });

  it("puts the session token on the custom-scheme callback", () => {
    assert.equal(
      androidOAuthCallback("eventview-debug", "sess+1"),
      "eventview-debug://oauth?token=sess%2B1",
    );
  });

  it("builds an intent return that names the debug package", () => {
    const uri = androidOAuthIntent("eventview-debug", "sess+1");
    assert.match(uri, /^intent:\/\/oauth\?token=/);
    assert.match(uri, /scheme=eventview-debug/);
    assert.match(uri, /package=com\.eventview\.app\.debug/);
    assert.match(uri, /sess%2B1/);
  });

  it("rejects unknown packages", () => {
    assert.equal(androidPackageFor("eventview", "com.evil.app"), ANDROID_RELEASE_PACKAGE);
    assert.equal(androidPackageFor("eventview-debug", ANDROID_DEBUG_PACKAGE), ANDROID_DEBUG_PACKAGE);
  });
});
