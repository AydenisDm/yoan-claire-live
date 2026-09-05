import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authorizeHostToken,
  guestSharePayload,
  guestShareText,
  guestShareTitle,
  guestWatchUrl,
  hostMayGoLive,
  liveRoomName,
  resolveHostPassword,
} from "./live-config.ts";

describe("liveRoomName", () => {
  it("keeps the production LiveKit room eventview-live", () => {
    assert.equal(liveRoomName("live"), "eventview-live");
    assert.equal(liveRoomName(""), "eventview-live");
  });

  it("strips junk from a custom room id", () => {
    assert.equal(liveRoomName("Ceremony Hall!"), "eventview-ceremonyhall");
  });
});

describe("resolveHostPassword", () => {
  it("reads only server HOST_PASSWORD and has no shipped default", () => {
    assert.equal(resolveHostPassword({}), "");
    assert.equal(resolveHostPassword({ HOST_PASSWORD: "" }), "");
    assert.equal(resolveHostPassword({ HOST_PASSWORD: "  " }), "");
    assert.equal(resolveHostPassword({ VITE_HOST_PASSWORD: "vow" }), "");
    assert.equal(resolveHostPassword({ HOST_PASSWORD: "break-glass" }), "break-glass");
  });
});

describe("host token authorization", () => {
  it("rejects unauthenticated host token requests, including the old vow default", () => {
    assert.equal(hostMayGoLive(false), false);
    assert.equal(
      authorizeHostToken({ signedIn: false, password: "vow", expectedPassword: "" }),
      false,
    );
    assert.equal(
      authorizeHostToken({ signedIn: false, password: "vow", expectedPassword: "vow" }),
      false,
    );
    assert.equal(
      authorizeHostToken({
        signedIn: false,
        password: "break-glass",
        expectedPassword: "break-glass",
      }),
      false,
    );
  });

  it("allows an authenticated host without a client password", () => {
    assert.equal(hostMayGoLive(true), true);
    assert.equal(
      authorizeHostToken({ signedIn: true, password: undefined, expectedPassword: "" }),
      true,
    );
    assert.equal(
      authorizeHostToken({ signedIn: true, password: "wrong", expectedPassword: "break-glass" }),
      true,
    );
  });
});

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
    assert.ok(payload.text.startsWith("Watch live on EventView\n"));
  });
});
