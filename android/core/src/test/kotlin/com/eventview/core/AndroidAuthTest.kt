package com.eventview.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AndroidAuthTest {
    @Test
    fun startUrlIncludesSchemeAndDebugPackage() {
        assertEquals(
            "https://yoan-claire-live.vercel.app/android-auth?scheme=eventview-debug&pkg=com.eventview.app.debug",
            AndroidAuth.startUrl(LiveConfig.DEFAULT_API_BASE),
        )
        assertEquals(
            "https://yoan-claire-live.vercel.app/android-auth?scheme=eventview&pkg=com.eventview.app",
            AndroidAuth.startUrl(LiveConfig.DEFAULT_WATCH_URL, AndroidAuth.RELEASE_SCHEME),
        )
    }

    @Test
    fun rejectsUnknownSchemesAndKeepsReleaseWhenAsked() {
        assertEquals(AndroidAuth.DEBUG_SCHEME, AndroidAuth.sanitizeScheme("https"))
        assertEquals(AndroidAuth.DEBUG_SCHEME, AndroidAuth.sanitizeScheme(null))
        assertEquals(AndroidAuth.RELEASE_SCHEME, AndroidAuth.sanitizeScheme("eventview"))
        assertEquals(AndroidAuth.DEBUG_PACKAGE, AndroidAuth.packageFor("https"))
        assertEquals(AndroidAuth.RELEASE_PACKAGE, AndroidAuth.packageFor("eventview"))
        assertEquals(
            AndroidAuth.RELEASE_PACKAGE,
            AndroidAuth.packageFor("eventview", "com.evil.app"),
        )
        assertEquals(
            AndroidAuth.DEBUG_PACKAGE,
            AndroidAuth.packageFor("eventview-debug", "com.evil.app"),
        )
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
        assertEquals(
            "sess+1",
            AndroidAuth.parseCallbackToken("eventview-debug", "oauth", "sess%2B1"),
        )
        assertNull(AndroidAuth.parseCallbackToken("https", "oauth", "sess_abc"))
        assertNull(AndroidAuth.parseCallbackToken("eventview-debug", "host", "sess_abc"))
        assertNull(AndroidAuth.parseCallbackToken("eventview-debug", "oauth", "  "))
        assertNull(AndroidAuth.parseCallbackToken("eventview-debug", "oauth", null))
    }

    @Test
    fun readsTokenFromFragmentAndIntentStyleHost() {
        assertEquals(
            "sess_abc",
            AndroidAuth.tokenFromParts("eventview-debug", "oauth", null, "token=sess_abc"),
        )
        assertEquals(
            "sess_abc",
            AndroidAuth.tokenFromFragment("token=sess_abc"),
        )
    }

    @Test
    fun intentReturnNamesTheDebugPackage() {
        val uri = AndroidAuth.intentReturnUri("eventview-debug", "sess+1")
        assertTrue(uri.startsWith("intent://oauth?token="))
        assertTrue(uri.contains("scheme=eventview-debug"))
        assertTrue(uri.contains("package=com.eventview.app.debug"))
        assertTrue(uri.contains("sess%2B1") || uri.contains("sess%2b1"))
    }
}
