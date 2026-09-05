package com.eventview.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LiveConfigTest {
    @Test
    fun keepsProductionRoomName() {
        assertEquals("eventview-live", LiveConfig.liveRoomName("live"))
        assertEquals("eventview-live", LiveConfig.liveRoomName(""))
    }

    @Test
    fun stripsJunkFromCustomRoomId() {
        assertEquals("eventview-ceremonyhall", LiveConfig.liveRoomName("Ceremony Hall!"))
    }

    @Test
    fun hostMayGoLiveWhenSignedIn() {
        assertTrue(LiveConfig.hostMayGoLive(true, "", "vow"))
        assertTrue(LiveConfig.hostMayGoLive(true, null, ""))
    }

    @Test
    fun hostMayGoLiveWithMatchingPassword() {
        assertTrue(LiveConfig.hostMayGoLive(false, "vow", "vow"))
        assertFalse(LiveConfig.hostMayGoLive(false, "", "vow"))
        assertFalse(LiveConfig.hostMayGoLive(false, "nope", "vow"))
        assertFalse(LiveConfig.hostMayGoLive(false, "vow", ""))
    }

    @Test
    fun guestIdentityShapeMatchesServer() {
        val id = LiveConfig.newGuestIdentity("abc123def456789")
        assertTrue(LiveConfig.isValidGuestIdentity(id))
        assertTrue(id.startsWith("g-"))
        assertFalse(LiveConfig.isValidGuestIdentity("streamer"))
        assertFalse(LiveConfig.isValidGuestIdentity("guest"))
        assertFalse(LiveConfig.isValidGuestIdentity("g-ab"))
    }
}
