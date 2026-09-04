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
});
