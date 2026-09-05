package com.eventview.app.data.live

import android.content.Context
import android.media.AudioManager
import com.eventview.core.LiveAudioPolicy

/**
 * Puts the handset in a publish-safe audio session: communication mode
 * (hardware AEC) and speakerphone off so the mic does not hear the speaker.
 */
class HostAudioSession(context: Context) {
    private val audio = context.applicationContext.getSystemService(AudioManager::class.java)
    private var previousMode = AudioManager.MODE_NORMAL
    private var previousSpeaker = false
    private var held = false

    fun enter() {
        val manager = audio ?: return
        if (!held) {
            previousMode = manager.mode
            previousSpeaker = manager.isSpeakerphoneOn
            held = true
        }
        @Suppress("DEPRECATION")
        manager.mode = AudioManager.MODE_IN_COMMUNICATION
        @Suppress("DEPRECATION")
        manager.isSpeakerphoneOn = LiveAudioPolicy.hostSpeakerphoneOn()
        manager.isMicrophoneMute = false
    }

    fun leave() {
        val manager = audio ?: return
        if (!held) return
        @Suppress("DEPRECATION")
        manager.mode = previousMode
        @Suppress("DEPRECATION")
        manager.isSpeakerphoneOn = previousSpeaker
        held = false
    }
}
