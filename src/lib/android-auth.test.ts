import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  androidAuthDonePath,
  androidAuthErrorPath,
  androidAuthStartPath,
  androidOAuthCallback,
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
    assert.equal(androidAuthStartPath(), "/android-auth?scheme=eventview-debug");
    assert.equal(androidAuthDonePath("eventview-debug"), "/android-auth?scheme=eventview-debug&done=1");
    assert.equal(androidAuthErrorPath("eventview"), "/android-auth?scheme=eventview&error=1");
  });

  it("puts the session token on the custom-scheme callback", () => {
    assert.equal(
      androidOAuthCallback("eventview-debug", "sess+1"),
      "eventview-debug://oauth?token=sess%2B1",
    );
  });
});
