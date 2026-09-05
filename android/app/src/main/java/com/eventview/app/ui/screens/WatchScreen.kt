package com.eventview.app.ui.screens

import android.app.Activity
import android.app.PictureInPictureParams
import android.os.Build
import android.util.Rational
import android.view.WindowManager
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.eventview.app.data.live.ViewerUiState
import com.eventview.app.ui.components.ErrorBanner
import com.eventview.app.ui.components.EvPrimaryButton
import com.eventview.app.ui.components.GuestChatPanel
import com.eventview.app.ui.components.Kicker
import com.eventview.app.ui.components.LiveVideo
import com.eventview.app.ui.components.StatusBadge
import com.eventview.app.ui.components.WaitingPane
import com.eventview.app.ui.theme.EvBg
import com.eventview.app.ui.theme.EvFg
import com.eventview.app.ui.theme.EvSurface
import com.eventview.app.ui.theme.LocalEvColors
import com.eventview.app.util.EventViewWindow
import com.eventview.core.LiveConfig
import com.eventview.core.ViewerStatus

@Composable
fun WatchScreen(
    state: ViewerUiState,
    window: EventViewWindow,
    inPip: Boolean,
    onSendChat: (String) -> Unit,
    onToggleMute: () -> Unit,
    onUnmute: () -> Unit,
    onPipEligible: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val activity = LocalContext.current as? Activity
    LaunchedEffect(state.status) {
        onPipEligible(state.status == ViewerStatus.LIVE)
        if (state.status == ViewerStatus.LIVE && Build.VERSION.SDK_INT >= 31) {
            activity?.setPictureInPictureParams(
                PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(16, 9))
                    .setAutoEnterEnabled(true)
                    .build(),
            )
        }
    }
    DisposableEffect(state.status) {
        val windowObj = activity?.window
        if (state.status == ViewerStatus.LIVE) {
            windowObj?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
        onDispose { windowObj?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }

    if (inPip) {
        Box(modifier.fillMaxSize().background(EvBg)) {
            if (state.videoTrack != null) {
                LiveVideo(track = state.videoTrack, room = state.room)
            } else {
                WaitingPane(state.status)
            }
        }
        return
    }

    val pad = if (window.isTablet) 28.dp else 16.dp
    val chat: @Composable (Modifier) -> Unit = { chatMod ->
        GuestChatPanel(
            lines = state.chats,
            lastSentId = state.lastSentId,
            coolingDown = state.coolingDown,
            enabled = state.status == ViewerStatus.LIVE,
            onSend = onSendChat,
            compact = window.compactChrome,
            modifier = chatMod,
        )
    }

    if (window.isLandscape || window.twoPane) {
        Row(
            modifier
                .fillMaxSize()
                .background(EvBg)
                .padding(pad),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            PlayerStage(
                state = state,
                landscape = true,
                onUnmute = onUnmute,
                onToggleMute = onToggleMute,
                modifier = Modifier
                    .weight(1.25f)
                    .fillMaxHeight(),
            )
            Column(
                Modifier
                    .weight(0.9f)
                    .fillMaxHeight()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Header()
                ErrorBanner(state.error)
                chat(Modifier)
            }
        }
    } else {
        Column(
            modifier
                .fillMaxSize()
                .background(EvBg)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = pad)
                .padding(top = 12.dp, bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Header()
            PlayerStage(
                state = state,
                landscape = false,
                onUnmute = onUnmute,
                onToggleMute = onToggleMute,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 10f),
            )
            ErrorBanner(state.error)
            Text(
                "When the picture appears, tap for sound. Send a ready-made note below. Rotate for a larger view.",
                style = MaterialTheme.typography.bodyMedium,
                color = LocalEvColors.current.muted,
            )
            chat(Modifier)
        }
    }
}

@Composable
private fun Header() {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Kicker(LiveConfig.KICKER)
        Text(LiveConfig.EVENT_NAME, style = MaterialTheme.typography.displayMedium, color = EvFg)
    }
}

@Composable
private fun PlayerStage(
    state: ViewerUiState,
    landscape: Boolean,
    onUnmute: () -> Unit,
    onToggleMute: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier
            .clip(RoundedCornerShape(if (landscape) 12.dp else 16.dp))
            .background(EvSurface),
    ) {
        if (state.videoTrack != null && state.status == ViewerStatus.LIVE) {
            LiveVideo(track = state.videoTrack, room = state.room)
        } else {
            WaitingPane(state.status)
        }
        StatusBadge(state.status, Modifier.align(Alignment.TopStart).padding(12.dp))
        if (state.status == ViewerStatus.LIVE && state.muted) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(EvBg.copy(alpha = 0.45f))
                    .padding(20.dp),
                contentAlignment = Alignment.BottomCenter,
            ) {
                EvPrimaryButton("Tap for sound", onClick = onUnmute)
            }
        }
        if (state.status == ViewerStatus.LIVE && !state.muted) {
            IconButton(
                onClick = onToggleMute,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(8.dp)
                    .background(EvBg.copy(alpha = 0.55f), RoundedCornerShape(12.dp)),
            ) {
                Icon(Icons.AutoMirrored.Outlined.VolumeUp, contentDescription = "Sound on", tint = EvFg)
            }
        }
    }
}
