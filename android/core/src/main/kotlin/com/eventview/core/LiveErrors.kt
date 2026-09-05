package com.eventview.core

enum class LiveErrorCode {
    NOT_CONFIGURED,
    UNAUTHORIZED,
    ROOM_FULL,
    FAILED,
    NETWORK,
}

data class LiveFailure(
    val code: LiveErrorCode,
    val message: String,
) {
    companion object {
        fun fromHttp(status: Int, error: String?): LiveFailure {
            return when {
                error == "not_configured" || status == 503 -> LiveFailure(
                    LiveErrorCode.NOT_CONFIGURED,
                    "The live room is not connected on this site yet. Add LiveKit keys on Vercel, then try Go live again.",
                )
                status == 401 || error == "unauthorized" -> LiveFailure(
                    LiveErrorCode.UNAUTHORIZED,
                    "Could not start as host. Sign in again, then tap Go live.",
                )
                status == 429 || error == "room_full" -> LiveFailure(
                    LiveErrorCode.ROOM_FULL,
                    "The live room is full. Try again in a moment.",
                )
                else -> LiveFailure(
                    LiveErrorCode.FAILED,
                    "Could not join the live room.",
                )
            }
        }

        fun network(): LiveFailure = LiveFailure(
            LiveErrorCode.NETWORK,
            "Could not reach EventView. Check your connection and try again.",
        )
    }
}

enum class ViewerStatus {
    WAITING,
    LIVE,
    RECONNECTING,
    FULL,
    OFFLINE,
}

fun ViewerStatus.title(): String = when (this) {
    ViewerStatus.WAITING -> "The live picture will begin shortly"
    ViewerStatus.LIVE -> "Live"
    ViewerStatus.RECONNECTING -> "Reconnecting"
    ViewerStatus.FULL -> "The room is full"
    ViewerStatus.OFFLINE -> "The live room is not connected yet"
}

fun ViewerStatus.body(): String = when (this) {
    ViewerStatus.WAITING ->
        "Leave this page open. When the event goes live on EventView, the picture appears here."
    ViewerStatus.LIVE ->
        "When the picture appears, tap for sound. Send a ready-made note below."
    ViewerStatus.RECONNECTING ->
        "The live feed dropped. Stay here — the picture comes back on its own."
    ViewerStatus.FULL ->
        "About 200 people are already watching. Stay here — a seat opens as soon as someone leaves."
    ViewerStatus.OFFLINE ->
        "Leave this page open. When the host goes live, the picture appears here."
}

fun cameraPermissionMessage(): String =
    "Allow camera and microphone, then try Go live again."

fun cameraMissingMessage(): String =
    "No camera was found on this phone. Try another device."

fun cameraBusyMessage(): String =
    "The camera is busy in another app. Close it, then try Go live again."
