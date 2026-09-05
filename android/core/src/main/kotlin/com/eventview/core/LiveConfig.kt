package com.eventview.core

/** Mirrors `src/lib/live-config.ts` — do not rename the LiveKit room. */
object LiveConfig {
    const val HOST_IDENTITY = "streamer"
    const val MAX_VIEWERS = 220
    const val DEFAULT_ROOM_ID = "live"
    const val DEFAULT_API_BASE = "https://yoan-claire-live.vercel.app"
    const val DEFAULT_WATCH_URL = "https://yoan-claire-live.vercel.app/"
    const val PRODUCT_NAME = "EventView"
    const val EVENT_NAME = "EventView"
    const val KICKER = "Live"
    const val HOST_PASSWORD_FALLBACK = "vow"
    const val CHAT_COOLDOWN_MS = 8_000L
    const val TOKEN_TTL_HINT = "12h"

    fun liveRoomName(roomId: String): String {
        val slug = roomId.lowercase().replace(Regex("[^a-z0-9_-]"), "").take(40)
        return "eventview-${slug.ifEmpty { DEFAULT_ROOM_ID }}"
    }

    fun hostMayGoLive(
        signedIn: Boolean,
        password: String?,
        expectedPassword: String,
    ): Boolean {
        if (signedIn) return true
        return expectedPassword.isNotEmpty() && password == expectedPassword
    }

    fun isValidGuestIdentity(id: String): Boolean {
        return id != HOST_IDENTITY && id.matches(Regex("^g-[a-zA-Z0-9_-]{6,32}$"))
    }

    fun newGuestIdentity(randomHex: String): String {
        val slug = randomHex.lowercase().replace(Regex("[^a-z0-9]"), "").take(12)
        val padded = slug.padEnd(12, '0')
        return "g-$padded"
    }
}
