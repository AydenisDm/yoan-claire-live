package com.eventview.app

import android.app.Application
import io.livekit.android.LiveKit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class EventViewApplication : Application() {
    lateinit var container: AppContainer
        private set

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        LiveKit.init(this)
        container = AppContainer(this)
        appScope.launch { container.archive.load() }
        appScope.launch { container.auth.refresh() }
    }
}
