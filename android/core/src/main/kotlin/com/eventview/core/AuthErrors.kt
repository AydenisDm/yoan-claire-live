package com.eventview.core

/** Mirrors `src/lib/auth/email-errors.ts`. */
object AuthErrors {
    fun describe(message: String?, code: String? = null, fallback: String): String {
        val blob = "${code.orEmpty()} ${message.orEmpty()}"
        return when {
            Regex("invalid origin", RegexOption.IGNORE_CASE).containsMatchIn(blob) ->
                "This site is not allowed to create a session from this address. Try again in a moment."
            Regex(
                "missing_database|DATABASE_URL|cannot save accounts|pglite|required on Vercel",
                RegexOption.IGNORE_CASE,
            ).containsMatchIn(blob) ->
                "This site cannot save accounts yet. It needs a Postgres database on Vercel."
            Regex(
                "database_error|account database is not reachable|ECONNREFUSED|connection refused|timeout",
                RegexOption.IGNORE_CASE,
            ).containsMatchIn(blob) ->
                "The account database is not reachable. Try again in a moment."
            Regex("already exists|user.?already|duplicate", RegexOption.IGNORE_CASE).containsMatchIn(blob) ->
                "An account with that email already exists. Sign in instead."
            Regex("too short|min(imum)? password|at least", RegexOption.IGNORE_CASE).containsMatchIn(blob) ->
                "Use at least 8 characters for the password."
            Regex(
                "invalid (email|password)|incorrect|did not match|unauthorized|invalid_email_or_password",
                RegexOption.IGNORE_CASE,
            ).containsMatchIn(blob) ->
                "Email or password did not match."
            Regex("failed to fetch|networkerror|load failed|unable to resolve", RegexOption.IGNORE_CASE)
                .containsMatchIn(blob) ->
                "Could not reach the account service. Check your connection and try again."
            Regex("internal.?server|AUTH_ERROR|unexpected", RegexOption.IGNORE_CASE).containsMatchIn(blob) ->
                "The account service hit an error. Try again in a moment."
            else -> message?.trim()?.ifEmpty { fallback } ?: fallback
        }
    }
}
