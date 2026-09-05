package com.eventview.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AuthFormTest {
    @Test
    fun requiresRealLookingEmail() {
        assertEquals("Enter your email.", AuthForm.emailFieldError(""))
        assertEquals("Enter a valid email address.", AuthForm.emailFieldError("not-an-email"))
        assertNull(AuthForm.emailFieldError("host@example.com"))
    }

    @Test
    fun surfacesEightCharacterRuleOnlyWhenCreating() {
        assertEquals("Choose a password.", AuthForm.passwordFieldError("", creating = true))
        assertEquals("Use at least 8 characters.", AuthForm.passwordFieldError("short", creating = true))
        assertNull(AuthForm.passwordFieldError("longenough", creating = true))
        assertEquals("Enter your password.", AuthForm.passwordFieldError("", creating = false))
        assertNull(AuthForm.passwordFieldError("short", creating = false))
    }

    @Test
    fun checksPasswordConfirmation() {
        assertEquals("Confirm your password.", AuthForm.confirmFieldError("password1", ""))
        assertEquals("Those passwords do not match.", AuthForm.confirmFieldError("password1", "password2"))
        assertNull(AuthForm.confirmFieldError("password1", "password1"))
    }

    @Test
    fun displayNameFallsBackToEmailLocalPart() {
        assertEquals("Ada", AuthForm.displayName("Ada", "ada@example.com"))
        assertEquals("ada", AuthForm.displayName("  ", "ada@example.com"))
        assertEquals("Host", AuthForm.displayName("", ""))
    }
}
