package com.eventview.core

/**
 * Custom-Tabs Google sign-in against production Better Auth.
 *
 * The phone opens `/android-auth?scheme=…` on the EventView site. That page
 * starts the existing web Google OAuth (no native Google SDK, no SHA-1). After
 * Google returns, the site redirects into this app with a session token:
 * `{scheme}://oauth?token=…`
 */
object AndroidAuth {
    const val DEBUG_SCHEME = "eventview-debug"
    const val RELEASE_SCHEME = "eventview"
    const val CALLBACK_HOST = "oauth"
    const val START_PATH = "/android-auth"
    const val TOKEN_QUERY = "token"

    fun sanitizeScheme(raw: String?): String {
        return if (raw == RELEASE_SCHEME) RELEASE_SCHEME else DEBUG_SCHEME
    }

    fun startUrl(apiBase: String, scheme: String = DEBUG_SCHEME): String {
        val origin = apiBase.trim().trimEnd('/')
        return "$origin$START_PATH?scheme=${sanitizeScheme(scheme)}"
    }

    fun callbackUri(scheme: String, token: String): String {
        return "${sanitizeScheme(scheme)}://$CALLBACK_HOST?$TOKEN_QUERY=${token.trim()}"
    }

    fun parseCallbackToken(
        scheme: String?,
        host: String?,
        token: String?,
    ): String? {
        val allowed = scheme == DEBUG_SCHEME || scheme == RELEASE_SCHEME
        if (!allowed || host != CALLBACK_HOST) return null
        return token?.trim()?.takeIf { it.isNotEmpty() }
    }
}
