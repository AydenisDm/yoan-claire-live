import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  guestSharePayload,
  guestShareText,
  guestShareTitle,
  guestWatchUrl,
} from "./guest-share.ts";

describe("guest share copy", () => {
  it("keeps the production Vercel host and brands the message as EventView", () => {
    const payload = guestSharePayload();
    assert.equal(payload.url, "https://yoan-claire-live.vercel.app/");
    assert.equal(guestWatchUrl(), payload.url);
    assert.equal(payload.title, "Watch live on EventView");
    assert.equal(guestShareTitle(), payload.title);
    assert.equal(payload.text, "Watch live on EventView\nhttps://yoan-claire-live.vercel.app/");
    assert.equal(guestShareText(), payload.text);
    assert.match(payload.text, /EventView/);
    assert.doesNotMatch(payload.title, /Eventstream|Yoan|Claire|livestream/i);
    assert.doesNotMatch(payload.text, /Eventstream|Yoan|Claire|livestream/i);
  });

  it("uses an explicit product name without changing the production URL", () => {
    const payload = guestSharePayload("EventView");
    assert.equal(payload.url, "https://yoan-claire-live.vercel.app/");
    assert.equal(payload.title, "Watch live on EventView");
    assert.ok(payload.text.startsWith("Watch live on EventView"));
  });
});
