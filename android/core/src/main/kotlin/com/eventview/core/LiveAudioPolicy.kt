package com.eventview.core

/**
 * Host echo rules for EventView Android.
 *
 * The host publishes camera + mic. Playing the room mix (local or remote)
 * on the same handset loops the speaker into the mic. Guests are listen-only
 * and start muted until they tap for sound.
 */
object LiveAudioPolicy {
    fun hostPlaysRemoteAudio(): Boolean = false

    fun hostPlaysLocalAudio(): Boolean = false

    fun hostSpeakerphoneOn(): Boolean = false

    fun viewerPlaysAudio(muted: Boolean): Boolean = !muted

    fun shouldPauseGuestWhileHosting(): Boolean = true
}
