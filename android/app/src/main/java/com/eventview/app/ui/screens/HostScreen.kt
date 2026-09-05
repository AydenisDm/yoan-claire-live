package com.eventview.app.ui.screens

import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.eventview.app.BuildConfig
import com.eventview.app.data.live.HostLiveState
import com.eventview.app.ui.components.ErrorBanner
import com.eventview.app.ui.components.EvCard
import com.eventview.app.ui.components.EvPrimaryButton
import com.eventview.app.ui.components.EvSecondaryButton
import com.eventview.app.ui.components.Kicker
import com.eventview.app.ui.components.LiveVideo
import com.eventview.app.ui.components.StatusBadge
import com.eventview.app.ui.theme.EvBg
import com.eventview.app.ui.theme.EvFg
import com.eventview.app.ui.theme.LocalEvColors
import com.eventview.app.util.EventViewWindow
import com.eventview.core.AuthSession
import com.eventview.core.LiveSetupStatus
import com.eventview.core.ViewerStatus

@Composable
fun HostScreen(
    session: AuthSession?,
    setup: LiveSetupStatus?,
    live: HostLiveState,
    window: EventViewWindow,
    onGoLive: () -> Unit,
    onStop: () -> Unit,
    onFlip: () -> Unit,
    onTorch: () -> Unit,
    onShare: () -> Unit,
    onSignIn: () -> Unit,
    onRegister: () -> Unit,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (live.live || live.starting && live.videoTrack != null) {
        HostLiveOverlay(
            live = live,
            onStop = onStop,
            onFlip = onFlip,
            onTorch = onTorch,
            onShare = onShare,
            modifier = modifier,
        )
        return
    }

    val pad = if (window.isTablet) 28.dp else 16.dp
    Column(
        modifier
            .fillMaxSize()
            .background(EvBg)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = pad)
            .padding(top = 16.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Kicker(BuildConfig.PRODUCT_NAME)
                Text("Live", style = MaterialTheme.typography.displayMedium, color = EvFg)
                Text(
                    "Film from this device. Guests only watch.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = LocalEvColors.current.muted,
                )
            }
            if (session != null) {
                EvSecondaryButton("Sign out", onClick = onSignOut)
            }
        }

        EvCard {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Guest watch link", style = MaterialTheme.typography.titleLarge, color = EvFg)
                Text(
                    "Send this. Guests never sign in. Stopping a live saves a session to Archive on this phone.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = LocalEvColors.current.muted,
                )
                Text(
                    BuildConfig.WATCH_URL,
                    style = MaterialTheme.typography.bodyMedium,
                    color = EvFg,
                )
                EvPrimaryButton("Share guest link", onClick = onShare)
            }
        }

        if (setup != null && !setup.configured) {
            ErrorBanner(
                "The live room is not connected on this deployment yet. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET on Vercel, then redeploy.",
            )
        } else if (setup?.configured == true) {
            Text(
                "Live room ready${setup.room?.let { " · $it" } ?: ""}. Signed in is enough — tap Go live.",
                style = MaterialTheme.typography.bodySmall,
                color = LocalEvColors.current.subtle,
            )
        }

        if (session == null) {
            EvCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Camera account", style = MaterialTheme.typography.titleLarge, color = EvFg)
                    Text(
                        "Sign in or create an account to go live. Guests never need one.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = LocalEvColors.current.muted,
                    )
                    EvPrimaryButton("Sign in", onClick = onSignIn)
                    EvSecondaryButton("Create camera account", onClick = onRegister, modifier = Modifier.fillMaxWidth())
                }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Go live", style = MaterialTheme.typography.titleLarge, color = EvFg)
                Text(
                    "One tap fills the screen. Keep the phone plugged in. The room holds about 200 guests. A hotspot beats packed venue Wi‑Fi.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = LocalEvColors.current.muted,
                )
                ErrorBanner(live.error)
                EvPrimaryButton(
                    text = if (live.starting) "Starting…" else "Go live — full screen",
                    onClick = onGoLive,
                    enabled = !live.starting,
                    live = true,
                )
                Text(
                    "Signed in as ${session.user.name ?: session.user.email ?: "host"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = LocalEvColors.current.subtle,
                )
            }
        }
    }
}

@Composable
private fun HostLiveOverlay(
    live: HostLiveState,
    onStop: () -> Unit,
    onFlip: () -> Unit,
    onTorch: () -> Unit,
    onShare: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val activity = LocalContext.current as? ComponentActivity
    var chrome by remember { mutableStateOf(true) }
    DisposableEffect(Unit) {
        activity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose { activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }
    Box(
        modifier
            .fillMaxSize()
            .background(EvBg)
            .clickable { chrome = true },
    ) {
        LiveVideo(track = live.videoTrack, room = live.room, mirror = live.facingFront)
        Row(
            Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            StatusBadge(ViewerStatus.LIVE)
            EvSecondaryButton("Stop", onClick = onStop)
        }
        if (chrome) {
            Column(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(EvBg.copy(alpha = 0.72f))
                    .navigationBarsPadding()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    "${live.stats.watching} watching" +
                        (if (live.stats.ok > 0) " · ${live.stats.ok} clear" else "") +
                        (if (live.stats.trouble > 0) " · ${live.stats.trouble} trouble" else ""),
                    color = EvFg,
                    style = MaterialTheme.typography.titleMedium,
                )
                live.chats.lastOrNull()?.let {
                    Text(it.label, color = LocalEvColors.current.accent, style = MaterialTheme.typography.bodyMedium)
                }
                ErrorBanner(live.error)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    EvSecondaryButton("Flip", onClick = onFlip)
                    if (live.torchAvailable && !live.facingFront) {
                        EvSecondaryButton(if (live.torchOn) "Light off" else "Light", onClick = onTorch)
                    }
                    EvSecondaryButton("Share", onClick = onShare)
                }
            }
        }
    }
}
