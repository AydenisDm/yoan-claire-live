package com.eventview.app.ui.nav

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.LiveTv
import androidx.compose.material.icons.outlined.Radio
import androidx.compose.material.icons.outlined.VideoLibrary
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.NavigationRailItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.eventview.app.AppContainer
import com.eventview.app.BuildConfig
import com.eventview.app.live.HostLiveService
import com.eventview.app.ui.screens.ArchiveScreen
import com.eventview.app.ui.screens.ForgotScreen
import com.eventview.app.ui.screens.HostScreen
import com.eventview.app.ui.screens.HubScreen
import com.eventview.app.ui.screens.RegisterScreen
import com.eventview.app.ui.screens.SignInScreen
import com.eventview.app.ui.screens.WatchScreen
import com.eventview.app.ui.theme.EvAccent
import com.eventview.app.ui.theme.EvAccentFg
import com.eventview.app.ui.theme.EvBg
import com.eventview.app.ui.theme.EvFg
import com.eventview.app.ui.theme.EvSubtle
import com.eventview.app.ui.theme.EventViewTheme
import com.eventview.app.util.rememberEventViewWindow
import com.eventview.core.AuthSetupStatus
import com.eventview.core.Crowd
import com.eventview.core.LiveConfig
import com.eventview.core.LiveSetupStatus
import com.eventview.core.cameraPermissionMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

private enum class Tab(val route: String, val label: String, val icon: ImageVector) {
    Watch("watch", "Watch", Icons.Outlined.LiveTv),
    Live("live", "Live", Icons.Outlined.Radio),
    Archive("archive", "Archive", Icons.Outlined.VideoLibrary),
    Hub("hub", "Hub", Icons.Outlined.FavoriteBorder),
}

private const val ROUTE_SIGN_IN = "signin"
private const val ROUTE_REGISTER = "register"
private const val ROUTE_FORGOT = "forgot"

@Composable
fun EventViewApp(
    container: AppContainer,
    widthClass: WindowWidthSizeClass,
    inPip: Boolean,
    onPipEligible: (Boolean) -> Unit,
) {
    EventViewTheme {
        val scope = remember { CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate) }
        val nav = rememberNavController()
        val window = rememberEventViewWindow(widthClass)
        val context = LocalContext.current
        val session by container.auth.session.collectAsStateWithLifecycle(initialValue = null)
        val viewer by container.viewer.state.collectAsStateWithLifecycle()
        val host by container.host.state.collectAsStateWithLifecycle()
        val archive by container.archive.items.collectAsStateWithLifecycle()
        val hubPicks by container.hub.picks.collectAsStateWithLifecycle(initialValue = emptyMap())
        var authSetup by remember { mutableStateOf<AuthSetupStatus?>(null) }
        var liveSetup by remember { mutableStateOf<LiveSetupStatus?>(null) }
        var authBusy by remember { mutableStateOf(false) }
        var authError by remember { mutableStateOf<String?>(null) }

        LaunchedEffect(Unit) {
            container.viewer.start()
            runCatching { authSetup = container.auth.status() }
            runCatching { liveSetup = container.tokens.setup() }
        }

        val permissionLauncher = rememberLauncherForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions(),
        ) { grants ->
            val camera = grants[Manifest.permission.CAMERA] == true
            val mic = grants[Manifest.permission.RECORD_AUDIO] == true
            if (camera && mic) {
                if (Build.VERSION.SDK_INT >= 33) {
                    val notif = Manifest.permission.POST_NOTIFICATIONS
                    if (ContextCompat.checkSelfPermission(context, notif) != PackageManager.PERMISSION_GRANTED) {
                        (context as? Activity)?.requestPermissions(arrayOf(notif), 0)
                    }
                }
                HostLiveService.start(context)
                container.host.start()
            } else {
                Toast.makeText(context, cameraPermissionMessage(), Toast.LENGTH_LONG).show()
            }
        }

        fun requestGoLive() {
            val needed = listOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
                .filter { ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED }
            if (needed.isEmpty()) {
                HostLiveService.start(context)
                container.host.start()
            } else {
                permissionLauncher.launch(needed.toTypedArray())
            }
        }

        fun shareWatch() {
            val invite = LiveConfig.guestShareText(
                productName = BuildConfig.PRODUCT_NAME,
                origin = BuildConfig.WATCH_URL,
            )
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_SUBJECT, LiveConfig.guestShareTitle(BuildConfig.PRODUCT_NAME))
                putExtra(Intent.EXTRA_TEXT, invite)
            }
            context.startActivity(Intent.createChooser(intent, "Share EventView invite"))
        }

        fun go(route: String) {
            nav.navigate(route) {
                popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                launchSingleTop = true
                restoreState = true
            }
        }

        val backStack by nav.currentBackStackEntryAsState()
        val route = backStack?.destination?.route
        val hideChrome = inPip || host.live || route in setOf(ROUTE_SIGN_IN, ROUTE_REGISTER, ROUTE_FORGOT)
        val tabs = Tab.entries

        Scaffold(
            containerColor = EvBg,
            bottomBar = {
                if (!hideChrome && !window.useRail) {
                    NavigationBar(containerColor = EvBg) {
                        tabs.forEach { tab ->
                            NavigationBarItem(
                                selected = route == tab.route,
                                onClick = { go(tab.route) },
                                icon = { Icon(tab.icon, contentDescription = tab.label) },
                                label = { Text(tab.label) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = EvAccentFg,
                                    selectedTextColor = EvFg,
                                    indicatorColor = EvAccent,
                                    unselectedIconColor = EvSubtle,
                                    unselectedTextColor = EvSubtle,
                                ),
                            )
                        }
                    }
                }
            },
        ) { padding ->
            Row(Modifier.fillMaxSize()) {
                if (!hideChrome && window.useRail) {
                    NavigationRail(containerColor = EvBg, modifier = Modifier.padding(padding)) {
                        tabs.forEach { tab ->
                            NavigationRailItem(
                                selected = route == tab.route,
                                onClick = { go(tab.route) },
                                icon = { Icon(tab.icon, contentDescription = tab.label) },
                                label = { Text(tab.label) },
                                colors = NavigationRailItemDefaults.colors(
                                    selectedIconColor = EvAccentFg,
                                    selectedTextColor = EvFg,
                                    indicatorColor = EvAccent,
                                    unselectedIconColor = EvSubtle,
                                    unselectedTextColor = EvSubtle,
                                ),
                            )
                        }
                    }
                }
                NavHost(
                    navController = nav,
                    startDestination = Tab.Watch.route,
                    modifier = Modifier
                        .weight(1f)
                        .then(if (hideChrome) Modifier else Modifier.padding(padding)),
                ) {
                    composable(Tab.Watch.route) {
                        WatchScreen(
                            state = viewer,
                            window = window,
                            inPip = inPip,
                            onSendChat = { container.viewer.sendChat(it) },
                            onToggleMute = { container.viewer.setMuted(!viewer.muted) },
                            onUnmute = { container.viewer.setMuted(false) },
                            onPipEligible = onPipEligible,
                        )
                    }
                    composable(Tab.Live.route) {
                        HostScreen(
                            session = session,
                            setup = liveSetup,
                            live = host,
                            window = window,
                            onGoLive = { requestGoLive() },
                            onStop = {
                                container.host.stop()
                                HostLiveService.stop(context)
                            },
                            onFlip = { container.host.flipCamera() },
                            onTorch = { container.host.setTorch(!host.torchOn) },
                            onShare = { shareWatch() },
                            onSignIn = { nav.navigate(ROUTE_SIGN_IN) },
                            onRegister = { nav.navigate(ROUTE_REGISTER) },
                            onSignOut = { scope.launch { container.auth.signOut() } },
                        )
                    }
                    composable(Tab.Archive.route) {
                        ArchiveScreen(
                            items = archive,
                            window = window,
                            onDelete = { id -> scope.launch { container.archive.delete(id) } },
                            onShare = { shareWatch() },
                        )
                    }
                    composable(Tab.Hub.route) {
                        HubScreen(
                            picks = hubPicks,
                            window = window,
                            onChoose = { kind, choice ->
                                scope.launch {
                                    container.hub.choose(kind, choice)
                                    val trouble = Crowd.isPictureTrouble(choice) || Crowd.isSoundTrouble(choice)
                                    container.viewer.setReport(if (trouble) "bad" else "ok")
                                }
                            },
                        )
                    }
                    composable(ROUTE_SIGN_IN) {
                        SignInScreen(
                            setup = authSetup,
                            busy = authBusy,
                            error = authError,
                            onSubmit = { email, password ->
                                scope.launch {
                                    authBusy = true
                                    authError = null
                                    container.auth.signIn(email, password)
                                        .onSuccess { nav.popBackStack() }
                                        .onFailure { authError = it.message }
                                    authBusy = false
                                }
                            },
                            onRegister = { nav.navigate(ROUTE_REGISTER) },
                            onForgot = { nav.navigate(ROUTE_FORGOT) },
                            onWatch = { nav.popBackStack() },
                        )
                    }
                    composable(ROUTE_REGISTER) {
                        RegisterScreen(
                            setup = authSetup,
                            busy = authBusy,
                            error = authError,
                            onSubmit = { name, email, password ->
                                scope.launch {
                                    authBusy = true
                                    authError = null
                                    container.auth.register(name, email, password)
                                        .onSuccess { nav.popBackStack() }
                                        .onFailure { authError = it.message }
                                    authBusy = false
                                }
                            },
                            onSignIn = { nav.navigate(ROUTE_SIGN_IN) { launchSingleTop = true } },
                        )
                    }
                    composable(ROUTE_FORGOT) {
                        ForgotScreen(
                            onSignIn = { nav.popBackStack() },
                            onRegister = { nav.navigate(ROUTE_REGISTER) },
                        )
                    }
                }
            }
        }
    }
}
