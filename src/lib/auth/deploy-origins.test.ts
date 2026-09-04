import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectAllowedHosts,
  collectTrustedOrigins,
  hostFromValue,
} from "./deploy-origins.ts";

describe("hostFromValue", () => {
  it("parses full URLs and bare Vercel hosts", () => {
    assert.equal(hostFromValue("https://yoan-claire-live.vercel.app"), "yoan-claire-live.vercel.app");
    assert.equal(hostFromValue("yoan-claire-live-git-main.vercel.app"), "yoan-claire-live-git-main.vercel.app");
    assert.equal(hostFromValue("https://eventview.grok.me/"), "eventview.grok.me");
  });
});

describe("collectAllowedHosts", () => {
  it("always includes Vercel, Grok, and preview wildcards", () => {
    const hosts = collectAllowedHosts({});
    assert.ok(hosts.includes("*.vercel.app"));
    assert.ok(hosts.includes("*.grok.me"));
    assert.ok(hosts.includes("*.grok-sandbox.com"));
    assert.ok(hosts.includes("localhost"));
  });

  it("adds BETTER_AUTH_URL and VERCEL_URL even when they differ", () => {
    const hosts = collectAllowedHosts({
      BETTER_AUTH_URL: "https://eventview.grok.me",
      VERCEL_URL: "yoan-claire-live.vercel.app",
    });
    assert.ok(hosts.includes("eventview.grok.me"));
    assert.ok(hosts.includes("yoan-claire-live.vercel.app"));
  });
});

describe("collectTrustedOrigins", () => {
  it("trusts the production Vercel origin when BETTER_AUTH_URL is a grok.me URL", () => {
    const origins = collectTrustedOrigins({
      BETTER_AUTH_URL: "https://eventview.grok.me",
    });
    assert.ok(origins.includes("https://eventview.grok.me"));
    assert.ok(origins.includes("https://*.vercel.app"));
    assert.ok(origins.includes("*.vercel.app"));
    assert.ok(origins.includes("http://localhost:8080"));
  });

  it("accepts extra AUTH_TRUSTED_ORIGINS", () => {
    const origins = collectTrustedOrigins({
      AUTH_TRUSTED_ORIGINS: "https://watch.example.com, https://www.example.com/",
    });
    assert.ok(origins.includes("https://watch.example.com"));
    assert.ok(origins.includes("https://www.example.com"));
  });
});
