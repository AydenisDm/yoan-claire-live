import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hostMayGoLive, liveRoomName } from "./live-config.ts";

describe("liveRoomName", () => {
  it("keeps the production LiveKit room eventview-live", () => {
    assert.equal(liveRoomName("live"), "eventview-live");
    assert.equal(liveRoomName(""), "eventview-live");
  });

  it("strips junk from a custom room id", () => {
    assert.equal(liveRoomName("Ceremony Hall!"), "eventview-ceremonyhall");
  });
});

describe("hostMayGoLive", () => {
  it("lets a signed-in host through without a password", () => {
    assert.equal(hostMayGoLive(true, "", "vow"), true);
    assert.equal(hostMayGoLive(true, undefined, ""), true);
  });

  it("accepts the server password when nobody is signed in", () => {
    assert.equal(hostMayGoLive(false, "vow", "vow"), true);
    assert.equal(hostMayGoLive(false, "", "vow"), false);
    assert.equal(hostMayGoLive(false, "nope", "vow"), false);
    assert.equal(hostMayGoLive(false, "vow", ""), false);
  });
});
