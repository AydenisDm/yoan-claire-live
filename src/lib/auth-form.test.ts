import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { confirmFieldError, emailFieldError, passwordFieldError } from "./auth-form.ts";

describe("auth form validation", () => {
  it("requires a real-looking email", () => {
    assert.equal(emailFieldError(""), "Enter your email.");
    assert.equal(emailFieldError("not-an-email"), "Enter a valid email address.");
    assert.equal(emailFieldError("host@example.com"), null);
  });

  it("surfaces the 8+ character rule only when creating", () => {
    assert.equal(passwordFieldError("", { creating: true }), "Choose a password.");
    assert.equal(passwordFieldError("short", { creating: true }), "Use at least 8 characters.");
    assert.equal(passwordFieldError("longenough", { creating: true }), null);
    assert.equal(passwordFieldError("", { creating: false }), "Enter your password.");
    assert.equal(passwordFieldError("short", { creating: false }), null);
  });

  it("checks password confirmation", () => {
    assert.equal(confirmFieldError("password1", ""), "Confirm your password.");
    assert.equal(confirmFieldError("password1", "password2"), "Those passwords do not match.");
    assert.equal(confirmFieldError("password1", "password1"), null);
  });
});
