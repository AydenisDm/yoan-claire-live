import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAuthSecret } from "./secret.ts";

describe("resolveAuthSecret", () => {
  it("prefers BETTER_AUTH_SECRET", () => {
    const a = resolveAuthSecret(
      { BETTER_AUTH_SECRET: "explicit-secret", POSTGRES_URL: "postgres://x" },
      () => "preview",
    );
    assert.equal(a.secret, "explicit-secret");
    assert.equal(a.stable, true);
  });

  it("derives a stable secret from DATABASE_URL when the explicit secret is missing", () => {
    const a = resolveAuthSecret({ POSTGRES_URL: "postgres://same" }, () => "preview");
    const b = resolveAuthSecret({ POSTGRES_URL: "postgres://same" }, () => "preview");
    const c = resolveAuthSecret({ NEON_DATABASE_URL: "postgres://other" }, () => "preview");
    assert.equal(a.stable, true);
    assert.equal(a.secret, b.secret);
    assert.notEqual(a.secret, c.secret);
    assert.equal(a.secret.length, 64);
  });

  it("uses the preview fallback only when there is no database", () => {
    const a = resolveAuthSecret({}, () => "preview-only");
    assert.equal(a.secret, "preview-only");
    assert.equal(a.stable, false);
  });
});
