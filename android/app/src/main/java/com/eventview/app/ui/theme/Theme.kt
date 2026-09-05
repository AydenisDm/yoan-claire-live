package com.eventview.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

data class EventViewExtraColors(
    val raised: Color,
    val muted: Color,
    val subtle: Color,
    val border: Color,
    val accent: Color,
    val accentFg: Color,
    val live: Color,
    val liveFg: Color,
    val warn: Color,
    val glow: Color,
)

val LocalEvColors = staticCompositionLocalOf {
    EventViewExtraColors(
        raised = EvRaised,
        muted = EvMuted,
        subtle = EvSubtle,
        border = EvBorder,
        accent = EvAccent,
        accentFg = EvAccentFg,
        live = EvLive,
        liveFg = EvLiveFg,
        warn = EvWarn,
        glow = EvGlow,
    )
}

val LocalTouchTarget = staticCompositionLocalOf { 52.dp }

private val DarkScheme: ColorScheme = darkColorScheme(
    primary = EvAccent,
    onPrimary = EvAccentFg,
    primaryContainer = EvRaised,
    onPrimaryContainer = EvFg,
    secondary = EvFg,
    onSecondary = EvBg,
    background = EvBg,
    onBackground = EvFg,
    surface = EvSurface,
    onSurface = EvFg,
    surfaceVariant = EvRaised,
    onSurfaceVariant = EvMuted,
    outline = EvBorder,
    outlineVariant = EvBorder,
    error = EvLive,
    onError = EvLiveFg,
    surfaceTint = Color.Transparent,
)

private val LightScheme: ColorScheme = lightColorScheme(
    primary = EvAccentFg,
    onPrimary = EvAccent,
    background = Color(0xFFF4F2EC),
    onBackground = EvAccentFg,
    surface = Color(0xFFFFFFFF),
    onSurface = EvAccentFg,
    surfaceVariant = Color(0xFFE8E4DC),
    onSurfaceVariant = Color(0xFF4A4E58),
    outline = Color(0xFFD0CBC2),
    error = EvLive,
    onError = EvLiveFg,
)

val ColorScheme.ev: EventViewExtraColors
    @Composable get() = LocalEvColors.current

@Composable
fun EventViewTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit,
) {
    val scheme = if (darkTheme || !isSystemInDarkTheme()) DarkScheme else LightScheme
    val extras = if (darkTheme) {
        EventViewExtraColors(
            raised = EvRaised,
            muted = EvMuted,
            subtle = EvSubtle,
            border = EvBorder,
            accent = EvAccent,
            accentFg = EvAccentFg,
            live = EvLive,
            liveFg = EvLiveFg,
            warn = EvWarn,
            glow = EvGlow,
        )
    } else {
        EventViewExtraColors(
            raised = Color(0xFFE8E4DC),
            muted = Color(0xFF5C616C),
            subtle = Color(0xFF7A7F8A),
            border = Color(0xFFD0CBC2),
            accent = EvAccentFg,
            accentFg = EvAccent,
            live = EvLive,
            liveFg = EvLiveFg,
            warn = Color(0xFFA66A1A),
            glow = Color(0x2214130F),
        )
    }
    CompositionLocalProvider(
        LocalEvColors provides extras,
        LocalTouchTarget provides 52.dp,
    ) {
        MaterialTheme(
            colorScheme = scheme,
            typography = EventViewTypography,
            content = content,
        )
    }
}

fun minTouch(): Dp = 52.dp
