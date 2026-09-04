import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DATABASE_URL_KEYS, resolveDatabaseUrl } from "./database-url.mjs";

describe("resolveDatabaseUrl", () => {
  it("prefers DATABASE_URL", () => {
    const found = resolveDatabaseUrl({
      DATABASE_URL: "postgres://a",
      POSTGRES_URL: "postgres://b",
    });
    assert.equal(found.key, "DATABASE_URL");
    assert.equal(found.url, "postgres://a");
  });

  it("falls back to Vercel Postgres / Neon aliases", () => {
    const found = resolveDatabaseUrl({ POSTGRES_URL: " postgres://neon " });
    assert.equal(found.key, "POSTGRES_URL");
    assert.equal(found.url, "postgres://neon");
  });

  it("treats empty values as unset", () => {
    const found = resolveDatabaseUrl({ DATABASE_URL: "  ", POSTGRES_URL: "" });
    assert.equal(found.url, undefined);
    assert.equal(found.key, undefined);
  });

  it("lists the keys migrate and runtime both read", () => {
    assert.ok(DATABASE_URL_KEYS.includes("DATABASE_URL"));
    assert.ok(DATABASE_URL_KEYS.includes("POSTGRES_URL"));
    assert.ok(DATABASE_URL_KEYS.includes("NEON_DATABASE_URL"));
  });
});
