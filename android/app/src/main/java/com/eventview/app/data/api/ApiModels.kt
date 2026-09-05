package com.eventview.app.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LiveSetupDto(
    val configured: Boolean = false,
    val room: String? = null,
    val error: String? = null,
    val ok: Boolean? = null,
)

@Serializable
data class LiveTokenRequest(
    val role: String,
    val password: String? = null,
    val identity: String? = null,
    val check: Boolean? = null,
)

@Serializable
data class LiveTokenDto(
    val token: String? = null,
    val url: String? = null,
    val identity: String? = null,
    val room: String? = null,
    val configured: Boolean = true,
    val error: String? = null,
)

@Serializable
data class AuthSetupDto(
    val ok: Boolean = false,
    val code: String = "",
    val message: String = "",
    val persist: String = "none",
    val emailPassword: Boolean = false,
    val social: Boolean = false,
    val secretStable: Boolean = false,
)

@Serializable
data class EmailSignInRequest(
    val email: String,
    val password: String,
)

@Serializable
data class EmailSignUpRequest(
    val email: String,
    val password: String,
    val name: String,
)

@Serializable
data class AuthUserDto(
    val id: String? = null,
    val email: String? = null,
    val name: String? = null,
    val image: String? = null,
)

@Serializable
data class AuthSessionInnerDto(
    val token: String? = null,
)

@Serializable
data class AuthSessionDto(
    val user: AuthUserDto? = null,
    val session: AuthSessionInnerDto? = null,
    val token: String? = null,
    val message: String? = null,
    val code: String? = null,
    val redirect: Boolean? = null,
)

@Serializable
data class AuthErrorDto(
    val message: String? = null,
    val code: String? = null,
)

@Serializable
data class FeedbackSubmitRequest(
    val guest: String,
    val kind: String,
    val choice: String,
)
