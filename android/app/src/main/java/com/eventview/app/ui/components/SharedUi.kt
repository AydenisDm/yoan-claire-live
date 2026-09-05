package com.eventview.app.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.eventview.app.ui.theme.EvAccent
import com.eventview.app.ui.theme.EvAccentFg
import com.eventview.app.ui.theme.EvBg
import com.eventview.app.ui.theme.EvFg
import com.eventview.app.ui.theme.EvLive
import com.eventview.app.ui.theme.EvLiveFg
import com.eventview.app.ui.theme.EvMotion
import com.eventview.app.ui.theme.EvRaised
import com.eventview.app.ui.theme.EvSurface
import com.eventview.app.ui.theme.LocalEvColors
import com.eventview.app.ui.theme.LocalTouchTarget
import com.eventview.app.ui.theme.rememberReduceMotion
import com.eventview.core.ViewerStatus
import com.eventview.core.body
import com.eventview.core.title

private val CardShape = RoundedCornerShape(20.dp)
private val ControlShape = RoundedCornerShape(16.dp)

@Composable
fun EvCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = LocalEvColors.current
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = CardShape,
        color = EvSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
        tonalElevation = 0.dp,
        shadowElevation = 0.dp,
    ) {
        Box(Modifier.padding(22.dp)) { content() }
    }
}

@Composable
fun EvPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    live: Boolean = false,
) {
    val min = LocalTouchTarget.current
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .fillMaxWidth()
            .height(min),
        shape = ControlShape,
        colors = if (live) {
            ButtonDefaults.buttonColors(containerColor = EvLive, contentColor = EvLiveFg)
        } else {
            ButtonDefaults.buttonColors(containerColor = EvAccent, contentColor = EvAccentFg)
        },
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp, pressedElevation = 0.dp),
    ) {
        Text(text, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
fun EvSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val min = LocalTouchTarget.current
    FilledTonalButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(min),
        shape = ControlShape,
        colors = ButtonDefaults.filledTonalButtonColors(
            containerColor = EvRaised,
            contentColor = EvFg,
        ),
    ) {
        Text(text, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun EvOutlineButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = LocalEvColors.current
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .fillMaxWidth()
            .height(LocalTouchTarget.current),
        shape = ControlShape,
        colors = ButtonDefaults.outlinedButtonColors(contentColor = EvFg),
        border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
    ) {
        Text(text, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
fun EvTextButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    TextButton(onClick = onClick, modifier = modifier.height(LocalTouchTarget.current)) {
        Text(text, color = EvFg, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun EvField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    hint: String? = null,
    error: String? = null,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    val colors = LocalEvColors.current
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = EvFg)
        if (hint != null && error == null) {
            Text(hint, style = MaterialTheme.typography.bodySmall, color = colors.subtle)
        }
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            isError = error != null,
            visualTransformation = visualTransformation,
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = EvAccent,
                unfocusedBorderColor = colors.border,
                errorBorderColor = colors.warn,
                focusedContainerColor = EvRaised,
                unfocusedContainerColor = EvRaised,
                focusedTextColor = EvFg,
                unfocusedTextColor = EvFg,
                cursorColor = EvAccent,
            ),
            shape = RoundedCornerShape(14.dp),
        )
        if (error != null) {
            Text(error, style = MaterialTheme.typography.bodySmall, color = colors.warn)
        }
    }
}

@Composable
fun StatusBadge(status: ViewerStatus, modifier: Modifier = Modifier) {
    val colors = LocalEvColors.current
    val (label, bg, fg) = when (status) {
        ViewerStatus.LIVE -> Triple("Live", EvLive, EvLiveFg)
        ViewerStatus.RECONNECTING -> Triple("Reconnecting", colors.warn, EvBg)
        ViewerStatus.FULL -> Triple("Full", colors.warn, EvBg)
        ViewerStatus.OFFLINE -> Triple("Offline", EvRaised, colors.muted)
        ViewerStatus.WAITING -> Triple("Waiting", EvRaised, colors.muted)
    }
    Row(
        modifier
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (status == ViewerStatus.LIVE) {
            Box(Modifier.size(7.dp).clip(CircleShape).background(EvLiveFg))
        }
        Text(label, color = fg, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun WaitingPane(status: ViewerStatus, modifier: Modifier = Modifier) {
    val colors = LocalEvColors.current
    val reduce = rememberReduceMotion()
    val pulse = rememberInfiniteTransition(label = "wait")
    val alpha by pulse.animateFloat(
        initialValue = if (reduce) 1f else 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            tween(if (reduce) 0 else EvMotion.Slow * 4, easing = EvMotion.Ease),
            RepeatMode.Reverse,
        ),
        label = "dot",
    )
    Box(
        modifier
            .fillMaxSize()
            .background(EvRaised)
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.widthIn(max = 420.dp),
        ) {
            Box(
                Modifier
                    .size(8.dp)
                    .alpha(alpha)
                    .clip(CircleShape)
                    .background(colors.accent),
            )
            Text(
                status.title(),
                style = MaterialTheme.typography.headlineSmall,
                color = EvFg,
            )
            Text(
                status.body(),
                style = MaterialTheme.typography.bodyMedium,
                color = colors.muted,
            )
            Text(
                "EVENTVIEW",
                style = MaterialTheme.typography.labelSmall,
                color = colors.subtle,
            )
        }
    }
}

@Composable
fun ErrorBanner(message: String?, modifier: Modifier = Modifier) {
    if (message.isNullOrBlank()) return
    val colors = LocalEvColors.current
    Text(
        message,
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(EvRaised)
            .border(1.dp, colors.border, RoundedCornerShape(14.dp))
            .padding(14.dp)
            .semantics { contentDescription = "Error: $message" },
        style = MaterialTheme.typography.bodyMedium,
        color = colors.warn,
    )
}

@Composable
fun Kicker(text: String, modifier: Modifier = Modifier) {
    Text(
        text.uppercase(),
        modifier = modifier,
        style = MaterialTheme.typography.labelSmall,
        color = LocalEvColors.current.subtle,
    )
}

@Composable
fun ScreenHeader(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    trailing: @Composable (() -> Unit)? = null,
) {
    Row(
        modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Column(
            Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Kicker("EventView")
            Text(title, style = MaterialTheme.typography.displayMedium, color = EvFg)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = LocalEvColors.current.muted)
        }
        trailing?.invoke()
    }
}

@Composable
fun SectionStack(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(18.dp), content = content)
}
