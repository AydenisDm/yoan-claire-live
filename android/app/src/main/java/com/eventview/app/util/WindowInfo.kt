package com.eventview.app.util

import android.content.res.Configuration
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Immutable
data class EventViewWindow(
    val widthClass: WindowWidthSizeClass,
    val isLandscape: Boolean,
    val isTablet: Boolean,
    val screenWidthDp: Dp,
    val screenHeightDp: Dp,
) {
    val useRail: Boolean get() = isTablet || (isLandscape && screenWidthDp >= 720.dp)
    val compactChrome: Boolean get() = isLandscape && !isTablet
    val twoPane: Boolean get() = isTablet && screenWidthDp >= 840.dp
}

@Composable
fun rememberEventViewWindow(
    widthClass: WindowWidthSizeClass,
): EventViewWindow {
    val config = LocalConfiguration.current
    return EventViewWindow(
        widthClass = widthClass,
        isLandscape = config.orientation == Configuration.ORIENTATION_LANDSCAPE,
        isTablet = config.smallestScreenWidthDp >= 600,
        screenWidthDp = config.screenWidthDp.dp,
        screenHeightDp = config.screenHeightDp.dp,
    )
}
