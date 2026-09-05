package com.eventview.core

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LiveAudioPolicyTest {
    @Test
    fun hostNeverPlaysTheRoomMix() {
        assertFalse(LiveAudioPolicy.hostPlaysRemoteAudio())
        assertFalse(LiveAudioPolicy.hostPlaysLocalAudio())
        assertFalse(LiveAudioPolicy.hostSpeakerphoneOn())
        assertTrue(LiveAudioPolicy.shouldPauseGuestWhileHosting())
    }

    @Test
    fun guestStartsSilentUntilTheyTap() {
        assertFalse(LiveAudioPolicy.viewerPlaysAudio(muted = true))
        assertTrue(LiveAudioPolicy.viewerPlaysAudio(muted = false))
    }
}
