package com.eventview.app.data.live

import android.app.Application
import com.eventview.core.LiveAudioPolicy
import io.livekit.android.AudioOptions
import io.livekit.android.AudioType
import io.livekit.android.LiveKit
import io.livekit.android.LiveKitOverrides
import io.livekit.android.RoomOptions
import io.livekit.android.audio.NoAudioHandler
import io.livekit.android.room.Room
import io.livekit.android.room.track.LocalAudioTrackOptions
import io.livekit.android.room.track.RemoteTrackPublication
import io.livekit.android.room.track.Track

internal val HostAudioCapture = LocalAudioTrackOptions(
    noiseSuppression = true,
    echoCancellation = true,
    autoGainControl = true,
    highPassFilter = true,
    typingNoiseDetection = true,
)

fun createHostRoom(app: Application): Room {
    return LiveKit.create(
        app,
        options = RoomOptions(
            adaptiveStream = false,
            dynacast = true,
            audioTrackCaptureDefaults = HostAudioCapture,
        ),
        overrides = LiveKitOverrides(
            audioOptions = AudioOptions(
                audioOutputType = AudioType.CallAudioType(),
                audioHandler = if (LiveAudioPolicy.hostPlaysRemoteAudio() || LiveAudioPolicy.hostPlaysLocalAudio()) {
                    null
                } else {
                    NoAudioHandler()
                },
            ),
        ),
    )
}

fun createGuestRoom(app: Application): Room {
    return LiveKit.create(
        app,
        options = RoomOptions(
            adaptiveStream = true,
            dynacast = true,
        ),
        overrides = LiveKitOverrides(
            audioOptions = AudioOptions(
                audioOutputType = AudioType.MediaAudioType(),
            ),
        ),
    )
}

fun Room.muteRemoteAudio(play: Boolean) {
    remoteParticipants.values.forEach { participant ->
        participant.trackPublications.values.forEach { pub ->
            if (pub.kind == Track.Kind.AUDIO) {
                val remote = pub as? RemoteTrackPublication
                runCatching { remote?.setEnabled(play) }
            }
        }
    }
}
