package com.eventview.core

import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

/**
 * Custom-Tabs Google sign-in against production Better Auth.
 *
 * The phone opens `/android-auth?scheme=…&pkg=…` on the EventView site. That
 * page starts the existing web Google OAuth (no native Google SDK, no SHA-1).
 * After Google returns, the site opens this app with a session token via
 * Chrome `intent://` (preferred) or `{scheme}://oauth?token=…`.
 */
object AndroidAuth {
    const val DEBUG_SCHEME = "eventview-debug"
    const val RELEASE_SCHEME = "eventview"
    const val CALLBACK_HOST = "oauth"
    const val START_PATH = "/android-auth"
    const val TOKEN_QUERY = "token"
    const val SCHEME_QUERY = "scheme"
    const val PACKAGE_QUERY = "pkg"
    const val DEBUG_PACKAGE = "com.eventview.app.debug"
    const val RELEASE_PACKAGE = "com.eventview.app"

    fun sanitizeScheme(raw: String?): String {
        return if (raw == RELEASE_SCHEME) RELEASE_SCHEME else DEBUG_SCHEME
    }

    fun packageFor(scheme: String, rawPackage: String? = null): String {
        val allowed = rawPackage == DEBUG_PACKAGE || rawPackage == RELEASE_PACKAGE
        if (allowed) return rawPackage!!
        return if (sanitizeScheme(scheme) == RELEASE_SCHEME) RELEASE_PACKAGE else DEBUG_PACKAGE
    }

    fun startUrl(apiBase: String, scheme: String = DEBUG_SCHEME): String {
        val origin = apiBase.trim().trimEnd('/')
        val clean = sanitizeScheme(scheme)
        val pkg = packageFor(clean)
        return "$origin$START_PATH?$SCHEME_QUERY=$clean&$PACKAGE_QUERY=$pkg"
    }

    fun callbackUri(scheme: String, token: String): String {
        return "${sanitizeScheme(scheme)}://$CALLBACK_HOST?$TOKEN_QUERY=${enc(token.trim())}"
    }

    /**
     * Chrome Custom Tabs reliably opens a specific package through `intent://`.
     * A raw custom-scheme `location.replace` is often swallowed (hunch, common).
     */
    fun intentReturnUri(scheme: String, token: String, pkg: String = packageFor(scheme)): String {
        val clean = sanitizeScheme(scheme)
        val encoded = enc(token.trim())
        val fallback = enc(callbackUri(clean, token))
        return "intent://$CALLBACK_HOST?$TOKEN_QUERY=$encoded#Intent;" +
            "scheme=$clean;package=$pkg;S.browser_fallback_url=$fallback;end"
    }

    fun parseCallbackToken(
        scheme: String?,
        host: String?,
        token: String?,
    ): String? {
        val allowed = scheme == DEBUG_SCHEME || scheme == RELEASE_SCHEME
        if (!allowed || !hostMatches(host)) return null
        return decodeToken(token)
    }

    fun tokenFromParts(
        scheme: String?,
        host: String?,
        queryToken: String?,
        fragment: String? = null,
    ): String? {
        val direct = parseCallbackToken(scheme, host, queryToken)
        if (direct != null) return direct
        val fromFragment = tokenFromFragment(fragment)
        return parseCallbackToken(scheme, host ?: CALLBACK_HOST, fromFragment)
    }

    fun tokenFromFragment(fragment: String?): String? {
        if (fragment.isNullOrBlank()) return null
        val raw = fragment.trim().trimStart('#')
        if (raw.startsWith("$TOKEN_QUERY=")) {
            return decodeToken(raw.substringAfter("="))
        }
        raw.split("&").forEach { part ->
            val name = part.substringBefore("=")
            if (name == TOKEN_QUERY) return decodeToken(part.substringAfter("="))
        }
        return null
    }

    private fun hostMatches(host: String?): Boolean {
        return host == CALLBACK_HOST || host.isNullOrBlank()
    }

    private fun decodeToken(raw: String?): String? {
        val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        val decoded = runCatching {
            URLDecoder.decode(trimmed, StandardCharsets.UTF_8.name())
        }.getOrDefault(trimmed).trim()
        return decoded.takeIf { it.isNotEmpty() }
    }

    private fun enc(value: String): String {
        return URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")
    }
}
