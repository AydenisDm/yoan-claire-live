package com.eventview.app.data.live

import android.app.Application
import com.eventview.app.data.auth.SessionStore
import com.eventview.core.ChatLine
import com.eventview.core.Crowd
import com.eventview.core.LiveConfig
import com.eventview.core.LiveData
import com.eventview.core.LiveErrorCode
import com.eventview.core.LiveRole
import com.eventview.core.ViewerStatus
import io.livekit.android.LiveKit
import io.livekit.android.RoomOptions
import io.livekit.android.events.RoomEvent
import io.livekit.android.events.collect
import io.livekit.android.room.Room
import io.livekit.android.room.participant.RemoteParticipant
import io.livekit.android.room.track.RemoteVideoTrack
import io.livekit.android.room.track.Track
import io.livekit.android.room.track.VideoTrack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class ViewerUiState(
    val status: ViewerStatus = ViewerStatus.WAITING,
    val room: Room? = null,
    val videoTrack: VideoTrack? = null,
    val chats: List<ChatLine> = emptyList(),
    val muted: Boolean = true,
    val lastSentId: String? = null,
    val coolingDown: Boolean = false,
    val error: String? = null,
    val configured: Boolean? = null,
)

class ViewerController(
    private val app: Application,
    private val tokens: LiveTokenRepository,
    private val sessionStore: SessionStore,
) {
    private val job = SupervisorJob()
    private val scope = CoroutineScope(job + Dispatchers.Main.immediate)
    private val _state = MutableStateFlow(ViewerUiState())
    val state: StateFlow<ViewerUiState> = _state.asStateFlow()

    private var room: Room? = null
    private var closed = false
    private var everLive = false
    private var reconnectJob: Job? = null
    private var backoffMs = 1_500L
    private var lastChatAt = 0L
    private var report: String? = null
    private var collectJob: Job? = null

    val isLive: Boolean get() = _state.value.status == ViewerStatus.LIVE

    fun start() {
        if (closed) {
            closed = false
        }
        scope.launch { connect() }
    }

    fun stop() {
        closed = true
        reconnectJob?.cancel()
        collectJob?.cancel()
        scope.launch {
            val current = room
            room = null
            _state.update { it.copy(videoTrack = null, status = ViewerStatus.WAITING) }
            withContext(Dispatchers.IO) {
                runCatching { current?.disconnect() }
                runCatching { current?.release() }
            }
        }
    }

    fun release() {
        stop()
        job.cancel()
    }

    fun setMuted(muted: Boolean) {
        _state.update { it.copy(muted = muted) }
        room?.remoteParticipants?.values?.forEach { participant ->
            participant.trackPublications.values.forEach { pub ->
                if (pub.kind == Track.Kind.AUDIO) {
                    pub.track?.let { runCatching { if (muted) pub.setEnabled(false) else pub.setEnabled(true) } }
                }
            }
        }
    }

    fun sendChat(id: String): Boolean {
        if (!Crowd.isChatId(id)) return false
        val now = System.currentTimeMillis()
        if (now - lastChatAt < LiveConfig.CHAT_COOLDOWN_MS) {
            _state.update { it.copy(coolingDown = true) }
            scheduleCoolClear()
            return false
        }
        lastChatAt = now
        val line = ChatLine(from = "you", id = id, label = Crowd.chatLabel(id) ?: id, at = now)
        _state.update {
            it.copy(
                chats = (it.chats + line).takeLast(8),
                lastSentId = id,
                coolingDown = true,
            )
        }
        scheduleCoolClear()
        publishPayload("chat", id)
        return true
    }

    fun setReport(value: String) {
        report = value
        publishPayload("report", value)
    }

    private fun scheduleCoolClear() {
        scope.launch {
            delay(LiveConfig.CHAT_COOLDOWN_MS)
            _state.update { it.copy(coolingDown = false) }
        }
    }

    private fun publishPayload(type: String, value: String) {
        val current = room ?: return
        scope.launch(Dispatchers.IO) {
            runCatching {
                current.localParticipant.publishData(
                    data = LiveData.encode(type, value).toByteArray(),
                    reliability = io.livekit.android.room.track.DataPublishReliability.RELIABLE,
                )
            }
        }
    }

    private suspend fun connect() {
        if (closed) return
        reconnectJob?.cancel()
        _state.update {
            it.copy(
                status = if (everLive) ViewerStatus.RECONNECTING else ViewerStatus.WAITING,
                error = null,
            )
        }
        val previous = room
        room = null
        collectJob?.cancel()
        withContext(Dispatchers.IO) {
            runCatching { previous?.disconnect() }
            runCatching { previous?.release() }
        }
        if (closed) return
        val creds = try {
            val identity = sessionStore.guestIdentity()
            tokens.mint(LiveRole.GUEST, identity = identity)
        } catch (err: LiveException) {
            when (err.failure.code) {
                LiveErrorCode.NOT_CONFIGURED -> {
                    _state.update { it.copy(status = ViewerStatus.OFFLINE, configured = false) }
                    return
                }
                LiveErrorCode.ROOM_FULL -> {
                    _state.update { it.copy(status = ViewerStatus.FULL, configured = true) }
                    scheduleReconnect(12_000)
                    return
                }
                else -> {
                    _state.update {
                        it.copy(
                            status = if (everLive) ViewerStatus.RECONNECTING else ViewerStatus.WAITING,
                            error = err.failure.message,
                        )
                    }
                    scheduleReconnect()
                    return
                }
            }
        } catch (_: Exception) {
            _state.update {
                it.copy(
                    status = if (everLive) ViewerStatus.RECONNECTING else ViewerStatus.WAITING,
                    error = "Could not reach EventView. Check your connection and try again.",
                )
            }
            scheduleReconnect()
            return
        }
        if (closed) return
        _state.update { it.copy(configured = true) }
        val next = LiveKit.create(
            app,
            options = RoomOptions(
                adaptiveStream = true,
                dynacast = true,
            ),
        )
        room = next
        _state.update { it.copy(room = next) }
        collectJob = scope.launch { collectEvents(next) }
        try {
            next.connect(creds.url, creds.token)
        } catch (_: Exception) {
            if (closed) return
            _state.update {
                it.copy(status = if (everLive) ViewerStatus.RECONNECTING else ViewerStatus.WAITING)
            }
            scheduleReconnect()
            return
        }
        if (closed) {
            runCatching { next.disconnect() }
            return
        }
        hydrateExisting(next)
        report?.let { publishPayload("report", it) }
    }

    private suspend fun collectEvents(current: Room) {
        current.events.collect { event ->
            if (closed || room !== current) return@collect
            when (event) {
                is RoomEvent.TrackSubscribed -> {
                    val participant = event.participant
                    if (participant is RemoteParticipant && participant.isEventHost()) {
                        if (event.track is VideoTrack) {
                            attachVideo(event.track as VideoTrack)
                        }
                    }
                }
                is RoomEvent.TrackUnsubscribed -> {
                    if (event.track is RemoteVideoTrack || event.track is VideoTrack) {
                        if (_state.value.videoTrack === event.track) {
                            detachVideo()
                        }
                    }
                }
                is RoomEvent.DataReceived -> handleData(event.data, event.participant?.identity?.value)
                is RoomEvent.ParticipantDisconnected -> {
                    if (event.participant.isEventHost()) detachVideo()
                }
                is RoomEvent.Reconnecting -> {
                    _state.update {
                        it.copy(status = if (everLive) ViewerStatus.RECONNECTING else ViewerStatus.WAITING)
                    }
                }
                is RoomEvent.Reconnected -> {
                    if (_state.value.videoTrack != null) {
                        _state.update { it.copy(status = ViewerStatus.LIVE) }
                    }
                    hydrateExisting(current)
                }
                is RoomEvent.Disconnected -> {
                    detachVideo()
                    scheduleReconnect()
                }
                else -> Unit
            }
        }
    }

    private fun hydrateExisting(current: Room) {
        current.remoteParticipants.values.forEach { participant ->
            if (!participant.isEventHost()) return@forEach
            participant.cameraVideoTrack()?.let { attachVideo(it) }
        }
    }

    private fun attachVideo(track: VideoTrack) {
        everLive = true
        backoffMs = 1_500L
        _state.update { it.copy(videoTrack = track, status = ViewerStatus.LIVE, error = null) }
    }

    private fun detachVideo() {
        _state.update {
            it.copy(
                videoTrack = null,
                status = if (everLive) ViewerStatus.RECONNECTING else ViewerStatus.WAITING,
            )
        }
    }

    private fun handleData(payload: ByteArray, from: String?) {
        val msg = LiveData.parse(payload.decodeToString()) ?: return
        if (msg.t != "chat" || !Crowd.isChatId(msg.v)) return
        val line = ChatLine(
            from = from ?: "guest",
            id = msg.v,
            label = Crowd.chatLabel(msg.v) ?: msg.v,
            at = System.currentTimeMillis(),
        )
        _state.update { it.copy(chats = (it.chats + line).takeLast(8)) }
    }

    private fun scheduleReconnect(overrideMs: Long? = null) {
        if (closed) return
        reconnectJob?.cancel()
        val wait = overrideMs ?: backoffMs
        backoffMs = minOf(8_000L, (backoffMs * 1.4).toLong())
        reconnectJob = scope.launch {
            delay(wait)
            connect()
        }
    }
}
