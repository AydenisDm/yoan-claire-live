package com.eventview.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.eventview.app.ui.components.ErrorBanner
import com.eventview.app.ui.components.EvField
import com.eventview.app.ui.components.EvPrimaryButton
import com.eventview.app.ui.components.EvSecondaryButton
import com.eventview.app.ui.components.EvTextButton
import com.eventview.app.ui.components.Kicker
import com.eventview.app.ui.theme.EvBg
import com.eventview.app.ui.theme.EvFg
import com.eventview.app.ui.theme.LocalEvColors
import com.eventview.core.AuthForm
import com.eventview.core.AuthSetupStatus
import com.eventview.core.LiveConfig

@Composable
fun SignInScreen(
    setup: AuthSetupStatus?,
    busy: Boolean,
    error: String?,
    onSubmit: (email: String, password: String) -> Unit,
    onGoogle: (() -> Unit)? = null,
    onRegister: () -> Unit,
    onForgot: () -> Unit,
    onWatch: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }

    fun submit() {
        val e = AuthForm.emailFieldError(email)
        val p = AuthForm.passwordFieldError(password, creating = false)
        emailError = e
        passwordError = p
        if (e == null && p == null) onSubmit(email, password)
    }

    AuthShell(
        title = "Host sign in",
        subtitle = "Use your camera account to go live. Guests never need an account.",
        setup = setup,
        modifier = modifier,
    ) {
        EvField(
            value = email,
            onValueChange = { email = it; emailError = null },
            label = "Email",
            error = emailError,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
        )
        EvField(
            value = password,
            onValueChange = { password = it; passwordError = null },
            label = "Password",
            hint = "At least 8 characters.",
            error = passwordError,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { submit() }),
        )
        EvTextButton("Forgot password?", onClick = onForgot, modifier = Modifier.align(Alignment.End))
        ErrorBanner(error)
        EvPrimaryButton(if (busy) "Signing in…" else "Sign in", onClick = ::submit, enabled = !busy)
        if (onGoogle != null && showGoogle(setup)) {
            AuthOrDivider()
            EvSecondaryButton(
                if (busy) "Opening Google…" else "Continue with Google",
                onClick = onGoogle,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        EvTextButton("Create a camera account", onClick = onRegister)
        EvTextButton("Watch without an account", onClick = onWatch)
    }
}

@Composable
fun RegisterScreen(
    setup: AuthSetupStatus?,
    busy: Boolean,
    error: String?,
    onSubmit: (name: String, email: String, password: String) -> Unit,
    onGoogle: (() -> Unit)? = null,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var confirmError by remember { mutableStateOf<String?>(null) }

    fun submit() {
        val e = AuthForm.emailFieldError(email)
        val p = AuthForm.passwordFieldError(password, creating = true)
        val c = AuthForm.confirmFieldError(password, confirm)
        emailError = e
        passwordError = p
        confirmError = c
        if (e == null && p == null && c == null) onSubmit(name, email, password)
    }

    AuthShell(
        title = "Create camera account",
        subtitle = "Continue with Google or register with email. Guests watch without signing in.",
        setup = setup,
        modifier = modifier,
    ) {
        if (onGoogle != null && showGoogle(setup)) {
            EvSecondaryButton(
                if (busy) "Opening Google…" else "Continue with Google",
                onClick = onGoogle,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )
            ErrorBanner(error)
            AuthOrDivider("or email")
        }
        EvField(
            value = name,
            onValueChange = { name = it },
            label = "Your name",
            hint = "Shown on this device. Optional.",
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
        )
        EvField(
            value = email,
            onValueChange = { email = it; emailError = null },
            label = "Email",
            error = emailError,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
        )
        EvField(
            value = password,
            onValueChange = { password = it; passwordError = null },
            label = "Password",
            hint = "At least 8 characters.",
            error = passwordError,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
        )
        EvField(
            value = confirm,
            onValueChange = { confirm = it; confirmError = null },
            label = "Confirm password",
            error = confirmError,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { submit() }),
        )
        if (onGoogle == null || !showGoogle(setup)) {
            ErrorBanner(error)
        }
        EvPrimaryButton(
            if (busy) "Creating account…" else "Create camera account",
            onClick = ::submit,
            enabled = !busy,
        )
        EvTextButton("Already have an account? Sign in", onClick = onSignIn)
    }
}

@Composable
fun ForgotScreen(onSignIn: () -> Unit, onRegister: () -> Unit, modifier: Modifier = Modifier) {
    AuthShell(
        title = "Forgot password",
        subtitle = "Email reset is not set up on this site. You will not be left on a dead end.",
        setup = null,
        modifier = modifier,
    ) {
        Text(
            "There is no “send a reset link” path here. If you still know the password, sign in. If you do not, create a new camera account with a different email — the old one stays unused.",
            style = MaterialTheme.typography.bodyMedium,
            color = LocalEvColors.current.muted,
        )
        EvPrimaryButton("Back to host sign in", onClick = onSignIn)
        EvTextButton("Create a new camera account", onClick = onRegister)
    }
}

@Composable
private fun showGoogle(setup: AuthSetupStatus?): Boolean {
    return setup == null || (setup.ok && setup.social)
}

@Composable
private fun AuthOrDivider(label: String = "or") {
    Row(
        Modifier.fillMaxWidth().padding(top = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            Modifier
                .weight(1f)
                .height(1.dp)
                .background(LocalEvColors.current.border),
        )
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = LocalEvColors.current.subtle,
        )
        Box(
            Modifier
                .weight(1f)
                .height(1.dp)
                .background(LocalEvColors.current.border),
        )
    }
}

@Composable
private fun AuthShell(
    title: String,
    subtitle: String,
    setup: AuthSetupStatus?,
    modifier: Modifier = Modifier,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    Column(
        modifier
            .fillMaxSize()
            .background(EvBg)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(
            Modifier.widthIn(max = 480.dp).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Kicker(LiveConfig.PRODUCT_NAME)
            Text(title, style = MaterialTheme.typography.displayMedium, color = EvFg)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = LocalEvColors.current.muted)
            if (setup != null && !setup.ok) {
                ErrorBanner(setup.message.ifBlank { "Accounts are not ready on this site yet." })
            } else {
                content()
            }
        }
    }
}
