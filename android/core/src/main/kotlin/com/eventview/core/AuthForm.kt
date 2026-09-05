package com.eventview.core

/** Mirrors `src/lib/auth-form.ts`. */
object AuthForm {
    fun looksLikeEmail(value: String): Boolean {
        return Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").matches(value.trim())
    }

    fun emailFieldError(value: String): String? {
        val trimmed = value.trim()
        if (trimmed.isEmpty()) return "Enter your email."
        if (!looksLikeEmail(trimmed)) return "Enter a valid email address."
        return null
    }

    fun passwordFieldError(value: String, creating: Boolean): String? {
        if (value.isEmpty()) return if (creating) "Choose a password." else "Enter your password."
        if (creating && value.length < 8) return "Use at least 8 characters."
        return null
    }

    fun confirmFieldError(password: String, confirm: String): String? {
        if (confirm.isEmpty()) return "Confirm your password."
        if (password != confirm) return "Those passwords do not match."
        return null
    }

    fun displayName(name: String, email: String): String {
        val trimmed = name.trim()
        if (trimmed.isNotEmpty()) return trimmed.take(80)
        val local = email.trim().substringBefore("@")
        return local.ifEmpty { "Host" }
    }
}
