package com.eventview.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AndroidAuthTest {
    @Test
    fun startUrlUsesProductionPathAndDebugScheme() {
        assertEquals(
            "https://yoan-claire-live.vercel.app/android-auth?scheme=eventview-debug",
            AndroidAuth.startUrl(LiveConfig.DEFAULT_API_BASE),
        )
        assertEquals(
            "https://yoan-claire-live.vercel.app/android-auth?scheme=eventview",
            AndroidAuth.startUrl(LiveConfig.DEFAULT_WATCH_URL, AndroidAuth.RELEASE_SCHEME),
        )
    }

    @Test
    fun rejectsUnknownSchemesAndKeepsReleaseWhenAsked() {
        assertEquals(AndroidAuth.DEBUG_SCHEME, AndroidAuth.sanitizeScheme("https"))
        assertEquals(AndroidAuth.DEBUG_SCHEME, AndroidAuth.sanitizeScheme(null))
        assertEquals(AndroidAuth.RELEASE_SCHEME, AndroidAuth.sanitizeScheme("eventview"))
    }

    @Test
    fun parsesOnlyEventViewOAuthCallbacks() {
        assertEquals(
            "sess_abc",
            AndroidAuth.parseCallbackToken("eventview-debug", "oauth", "sess_abc"),
        )
        assertEquals(
            "tok",
            AndroidAuth.parseCallbackToken("eventview", "oauth", " tok "),
        )
        assertNull(AndroidAuth.parseCallbackToken("https", "oauth", "sess_abc"))
        assertNull(AndroidAuth.parseCallbackToken("eventview-debug", "host", "sess_abc"))
        assertNull(AndroidAuth.parseCallbackToken("eventview-debug", "oauth", "  "))
        assertNull(AndroidAuth.parseCallbackToken("eventview-debug", "oauth", null))
    }
}
