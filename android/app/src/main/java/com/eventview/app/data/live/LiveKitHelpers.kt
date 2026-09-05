package com.eventview.app.data.live

import com.eventview.core.LiveConfig
import io.livekit.android.room.participant.Participant
import io.livekit.android.room.track.Track
import io.livekit.android.room.track.VideoTrack

fun Participant.isEventHost(): Boolean {
    if (identity?.value == LiveConfig.HOST_IDENTITY) return true
    return permissions?.canPublish == true && identity?.value != null &&
        !LiveConfig.isValidGuestIdentity(identity!!.value)
}

fun Participant.cameraVideoTrack(): VideoTrack? {
    val publication = getTrackPublication(Track.Source.CAMERA)
        ?: trackPublications.values.firstOrNull { it.kind == Track.Kind.VIDEO }
    return publication?.track as? VideoTrack
}
