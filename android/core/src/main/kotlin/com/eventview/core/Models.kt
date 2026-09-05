package com.eventview.core

data class LiveSetupStatus(
    val configured: Boolean,
    val room: String? = null,
)

data class LiveToken(
    val token: String,
    val url: String,
    val identity: String,
    val room: String,
    val configured: Boolean = true,
)

data class AuthSetupStatus(
    val ok: Boolean,
    val code: String,
    val message: String = "",
    val persist: String = "none",
    val emailPassword: Boolean = false,
    val social: Boolean = false,
    val secretStable: Boolean = false,
)

data class AuthUser(
    val id: String,
    val email: String?,
    val name: String?,
)

data class AuthSession(
    val user: AuthUser,
    val token: String?,
)

data class LiveStats(
    val watching: Int = 0,
    val ok: Int = 0,
    val trouble: Int = 0,
)

data class ArchiveSession(
    val id: String,
    val title: String,
    val startedAt: Long,
    val endedAt: Long,
    val durationMs: Long,
    val peakViewers: Int,
    val videoPath: String? = null,
)

enum class LiveRole { HOST, GUEST }
