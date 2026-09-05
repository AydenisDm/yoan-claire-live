import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeAuthError } from "./email-errors.ts";

describe("describeAuthError", () => {
  it("maps origin, duplicate, and credential failures", () => {
    assert.match(describeAuthError(new Error("Invalid origin"), "x"), /not allowed/i);
    assert.match(describeAuthError(new Error("User already exists"), "x"), /already exists/i);
    assert.match(describeAuthError(new Error("Invalid email or password"), "x"), /did not match/i);
  });

  it("keeps a useful fallback", () => {
    assert.equal(describeAuthError(new Error(""), "Could not sign in."), "Could not sign in.");
  });

  it("keeps social setup copy and maps a cancelled OAuth", () => {
    assert.match(
      describeAuthError(new Error("Google sign-in is not set up on this site yet. Add GOOGLE_CLIENT_SECRET."), "x"),
      /GOOGLE_CLIENT_SECRET/,
    );
    assert.match(describeAuthError(new Error("access_denied"), "x"), /cancelled/i);
  });

  it("maps a missing Vercel database to a setup sentence", () => {
    assert.match(
      describeAuthError({ message: "x", code: "missing_database" }, "x"),
      /cannot save accounts/i,
    );
    assert.match(
      describeAuthError(new Error("DATABASE_URL is required on Vercel"), "x"),
      /DATABASE_URL/,
    );
  });
});
