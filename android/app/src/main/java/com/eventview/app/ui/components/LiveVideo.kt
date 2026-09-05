package com.eventview.app.ui.components

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import io.livekit.android.renderer.TextureViewRenderer
import io.livekit.android.room.Room
import io.livekit.android.room.track.VideoTrack
import livekit.org.webrtc.RendererCommon

@Composable
fun LiveVideo(
    track: VideoTrack?,
    modifier: Modifier = Modifier,
    room: Room? = null,
    mirror: Boolean = false,
    fill: Boolean = true,
) {
    val scale = if (fill) {
        RendererCommon.ScalingType.SCALE_ASPECT_FILL
    } else {
        RendererCommon.ScalingType.SCALE_ASPECT_FIT
    }
    val bound = remember { arrayOfNulls<Any>(2) }
    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { context ->
            TextureViewRenderer(context).apply {
                setEnableHardwareScaler(true)
                setScalingType(scale)
                setMirror(mirror)
            }
        },
        update = { view ->
            view.setMirror(mirror)
            view.setScalingType(scale)
            if (room != null && bound[0] !== room) {
                runCatching { room.initVideoRenderer(view) }
                bound[0] = room
            }
            val previous = bound[1] as? VideoTrack
            if (previous !== track) {
                previous?.removeRenderer(view)
                if (track != null) {
                    runCatching { track.addRenderer(view) }
                }
                bound[1] = track
            }
        },
        onRelease = { view ->
            (bound[1] as? VideoTrack)?.removeRenderer(view)
            bound[0] = null
            bound[1] = null
            runCatching { view.release() }
        },
    )
}
