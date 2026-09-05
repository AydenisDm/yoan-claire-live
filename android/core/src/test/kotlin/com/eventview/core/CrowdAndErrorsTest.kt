package com.eventview.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CrowdAndErrorsTest {
    @Test
    fun chatIdsMatchWebCannedNotes() {
        assertTrue(Crowd.isChatId("love"))
        assertTrue(Crowd.isChatId("clap"))
        assertEquals("Love this", Crowd.chatLabel("love"))
        assertFalse(Crowd.isChatId("hello"))
        assertNull(Crowd.chatLabel("nope"))
    }

    @Test
    fun feedbackChoicesMatchHub() {
        assertTrue(Crowd.isFeedbackChoice("picture", "clear"))
        assertTrue(Crowd.isFeedbackChoice("sound", "none"))
        assertFalse(Crowd.isFeedbackChoice("picture", "loud"))
        assertTrue(Crowd.isPictureTrouble("stuck"))
        assertFalse(Crowd.isPictureTrouble("clear"))
    }

    @Test
    fun liveDataRoundTrip() {
        val raw = LiveData.encode("chat", "wow")
        val parsed = LiveData.parse(raw)
        assertEquals("chat", parsed?.t)
        assertEquals("wow", parsed?.v)
        assertNull(LiveData.parse("not-json"))
    }

    @Test
    fun liveFailureFromHttpCodes() {
        assertEquals(LiveErrorCode.UNAUTHORIZED, LiveFailure.fromHttp(401, "unauthorized").code)
        assertEquals(LiveErrorCode.ROOM_FULL, LiveFailure.fromHttp(429, "room_full").code)
        assertEquals(LiveErrorCode.NOT_CONFIGURED, LiveFailure.fromHttp(503, "not_configured").code)
        assertEquals(LiveErrorCode.FAILED, LiveFailure.fromHttp(500, "failed").code)
    }

    @Test
    fun authErrorsMapBetterAuthCodes() {
        assertEquals(
            "Email or password did not match.",
            AuthErrors.describe("Invalid email or password", "INVALID_EMAIL_OR_PASSWORD", "fail"),
        )
        assertEquals(
            "An account with that email already exists. Sign in instead.",
            AuthErrors.describe("User already exists", "USER_ALREADY_EXISTS", "fail"),
        )
        assertEquals(
            "Could not reach the account service. Check your connection and try again.",
            AuthErrors.describe("Failed to fetch", null, "fail"),
        )
        assertEquals(
            "Google sign-in is not on this EventView site yet. Use email and password, or try again after the site updates.",
            AuthErrors.describe("404 android-auth", "handoff_missing", "fail"),
        )
        assertEquals(
            "Google sign-in did not finish. Try again, or use email and password.",
            AuthErrors.describe("state_not_found", "oauth", "fail"),
        )
    }

    @Test
    fun viewerCopyCoversFullRoom() {
        assertTrue(ViewerStatus.FULL.body().contains("200"))
        assertTrue(ViewerStatus.WAITING.title().contains("shortly"))
    }
}
