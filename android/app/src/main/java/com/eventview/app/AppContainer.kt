package com.eventview.app

import android.app.Application
import com.eventview.app.data.api.NetworkModule
import com.eventview.app.data.archive.ArchiveStore
import com.eventview.app.data.auth.AuthRepository
import com.eventview.app.data.auth.SessionStore
import com.eventview.app.data.hub.HubStore
import com.eventview.app.data.live.HostLiveController
import com.eventview.app.data.live.LiveTokenRepository
import com.eventview.app.data.live.ViewerController
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

class AppContainer(app: Application) {
    val sessionStore = SessionStore(app)
    val api = NetworkModule.createApi(
        tokenProvider = { sessionStore.cachedToken() },
        tokenSink = { sessionStore.rememberToken(it) },
    )
    val auth = AuthRepository(api, sessionStore)
    val tokens = LiveTokenRepository(api)
    val archive = ArchiveStore(app)
    val hub = HubStore(app)
    val host = HostLiveController(app, tokens, archive)
    val viewer = ViewerController(app, tokens, sessionStore)

    private val googleTokenSink = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val googleTokens: SharedFlow<String> = googleTokenSink

    fun offerGoogleToken(token: String) {
        if (token.isNotBlank()) googleTokenSink.tryEmit(token)
    }
}
