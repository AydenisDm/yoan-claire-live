package com.eventview.app.data.live

import android.app.Application
import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import com.eventview.app.data.archive.ArchiveStore
import com.eventview.app.util.archiveTitle
import com.eventview.core.ArchiveSession
import com.eventview.core.ChatLine
import com.eventview.core.Crowd
import com.eventview.core.LiveConfig
import com.eventview.core.LiveData
import com.eventview.core.LiveRole
import com.eventview.core.LiveStats
import com.eventview.core.LiveAudioPolicy
import io.livekit.android.events.RoomEvent
import io.livekit.android.events.collect
import io.livekit.android.room.Room
import io.livekit.android.room.track.LocalVideoTrack
import io.livekit.android.room.track.RemoteTrackPublication
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
import java.util.UUID

data class HostLiveState(
    val live: Boolean = false,
    val starting: Boolean = false,
    val room: io.livekit.android.room.Room? = null,
    val videoTrack: VideoTrack? = null,
    val facingFront: Boolean = false,
    val torchAvailable: Boolean = false,
    val torchOn: Boolean = false,
    val stats: LiveStats = LiveStats(),
    val chats: List<ChatLine> = emptyList(),
    val error: String? = null,
    val startedAt: Long = 0L,
)

class HostLiveController(
    private val app: Application,
    private val tokens: LiveTokenRepository,
    private val archive: ArchiveStore,
) {
    private val job = SupervisorJob()
    private val scope = CoroutineScope(job + Dispatchers.Main.immediate)
    private val _state = MutableStateFlow(HostLiveState())
    val state: StateFlow<HostLiveState> = _state.asStateFlow()

    private var room: Room? = null
    private var collectJob: Job? = null
    private var reconnectJob: Job? = null
    private var closed = true
    private var starting = false
    private var backoffMs = 1_500L
    private val reports = mutableMapOf<String, String>()
    private var peakViewers = 0
    private var startedAt = 0L
    private val audioSession = HostAudioSession(app)

    val isLive: Boolean get() = _state.value.live

    fun start(password: String? = null) {
        if (starting || _state.value.live && !closed) return
        closed = false
        starting = true
        _state.update { it.copy(starting = true, error = null) }
        scope.launch {
            try {
                connect(password)
            } catch (err: LiveException) {
                audioSession.leave()
                _state.update { it.copy(starting = false, live = false, error = err.failure.message) }
                closed = true
            } catch (err: Exception) {
                audioSession.leave()
                _state.update {
                    it.copy(
                        starting = false,
                        live = false,
                        error = err.message ?: "Could not start the live picture. Try Go live again.",
                    )
                }
                closed = true
            } finally {
                starting = false
            }
        }
    }

    fun stop() {
        val wasLive = _state.value.live || startedAt > 0
        val durationStart = startedAt
        val peak = peakViewers
        closed = true
        starting = false
        reconnectJob?.cancel()
        collectJob?.cancel()
        audioSession.leave()
        scope.launch {
            val current = room
            room = null
            reports.clear()
            _state.value = HostLiveState()
            withContext(Dispatchers.IO) {
                runCatching { current?.disconnect() }
                runCatching { current?.release() }
            }
            setTorchInternal(false)
            if (wasLive && durationStart > 0) {
                val ended = System.currentTimeMillis()
                archive.add(
                    ArchiveSession(
                        id = UUID.randomUUID().toString(),
                        title = archiveTitle(durationStart),
                        startedAt = durationStart,
                        endedAt = ended,
                        durationMs = (ended - durationStart).coerceAtLeast(0),
                        peakViewers = peak,
                    ),
                )
            }
            startedAt = 0L
            peakViewers = 0
        }
    }

    fun flipCamera() {
        val track = localVideo() ?: return
        runCatching { track.switchCamera() }
        _state.update { it.copy(facingFront = !it.facingFront, torchOn = false) }
        if (_state.value.facingFront) setTorch(false)
    }

    fun setTorch(on: Boolean) {
        if (!setTorchInternal(on)) {
            _state.update { it.copy(torchAvailable = false, error = "Light is not available on this camera.") }
        } else {
            _state.update { it.copy(torchOn = on) }
        }
    }

    private fun setTorchInternal(on: Boolean): Boolean {
        return runCatching {
            val manager = app.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val back = manager.cameraIdList.firstOrNull { id ->
                manager.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING) ==
                    CameraCharacteristics.LENS_FACING_BACK &&
                    manager.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
            } ?: return false
            manager.setTorchMode(back, on)
            true
        }.getOrDefault(false)
    }

    private fun localVideo(): LocalVideoTrack? {
        return room?.localParticipant?.getTrackPublication(Track.Source.CAMERA)?.track as? LocalVideoTrack
    }

    private suspend fun connect(password: String?) {
        reconnectJob?.cancel()
        val previous = room
        room = null
        collectJob?.cancel()
        withContext(Dispatchers.IO) {
            runCatching { previous?.disconnect() }
            runCatching { previous?.release() }
        }
        if (closed) return
        val creds = tokens.mint(LiveRole.HOST, password = password)
        if (closed) return
        audioSession.enter()
        val next = createHostRoom(app)
        room = next
        collectJob = scope.launch { collectEvents(next) }
        next.connect(creds.url, creds.token)
        if (closed) {
            audioSession.leave()
            runCatching { next.disconnect() }
            return
        }
        silenceHostPlayback(next)
        next.localParticipant.setCameraEnabled(true)
        next.localParticipant.setMicrophoneEnabled(true)
        if (closed) return
        backoffMs = 1_500L
        if (startedAt == 0L) startedAt = System.currentTimeMillis()
        val video = next.localParticipant.getTrackPublication(Track.Source.CAMERA)?.track as? VideoTrack
        val torch = hasBackFlash()
        _state.update {
            it.copy(
                live = true,
                starting = false,
                room = next,
                videoTrack = video,
                torchAvailable = torch && !it.facingFront,
                error = null,
                startedAt = startedAt,
            )
        }
        emitStats(next)
    }

    private suspend fun collectEvents(current: Room) {
        current.events.collect { event ->
            if (closed || room !== current) return@collect
            when (event) {
                is RoomEvent.ParticipantConnected,
                is RoomEvent.ParticipantDisconnected,
                -> {
                    if (event is RoomEvent.ParticipantDisconnected) {
                        reports.remove(event.participant.identity?.value)
                    }
                    emitStats(current)
                }
                is RoomEvent.DataReceived -> handleData(
                    event.data,
                    event.participant?.identity?.value ?: "guest",
                )
                is RoomEvent.Disconnected -> {
                    if (!closed) {
                        emitStats(current)
                        scheduleReconnect()
                    }
                }
                is RoomEvent.TrackPublished -> {
                    if (event.participant is io.livekit.android.room.participant.LocalParticipant &&
                        event.publication.kind == Track.Kind.VIDEO
                    ) {
                        _state.update {
                            it.copy(videoTrack = event.publication.track as? VideoTrack)
                        }
                    }
                    if (event.publication.kind == Track.Kind.AUDIO) {
                        silenceHostPlayback(current)
                    }
                }
                is RoomEvent.TrackSubscribed -> {
                    if (event.publication.kind == Track.Kind.AUDIO) {
                        silenceHostPlayback(current)
                    }
                }
                else -> Unit
            }
        }
    }

    private fun handleData(payload: ByteArray, from: String) {
        val msg = LiveData.parse(payload.decodeToString()) ?: return
        if (msg.t == "report" && (msg.v == "ok" || msg.v == "bad")) {
            reports[from] = msg.v
            room?.let { emitStats(it) }
            return
        }
        if (msg.t == "chat" && Crowd.isChatId(msg.v)) {
            val line = ChatLine(
                from = from,
                id = msg.v,
                label = Crowd.chatLabel(msg.v) ?: msg.v,
                at = System.currentTimeMillis(),
            )
            _state.update { it.copy(chats = (it.chats + line).takeLast(8)) }
        }
    }

    private fun emitStats(current: Room) {
        val watching = current.remoteParticipants.values.count { participant ->
            participant.identity?.value != LiveConfig.HOST_IDENTITY
        }
        peakViewers = maxOf(peakViewers, watching)
        val ok = reports.values.count { it == "ok" }
        val trouble = reports.values.count { it == "bad" }
        _state.update { it.copy(stats = LiveStats(watching, ok, trouble)) }
    }

    private fun scheduleReconnect() {
        if (closed || reconnectJob?.isActive == true) return
        val wait = backoffMs
        backoffMs = minOf(8_000L, (backoffMs * 1.4).toLong())
        reconnectJob = scope.launch {
            delay(wait)
            if (closed) return@launch
            runCatching { connect(null) }.onFailure {
                if (!closed) scheduleReconnect()
            }
        }
    }

    private fun silenceHostPlayback(current: Room) {
        if (LiveAudioPolicy.hostPlaysRemoteAudio()) return
        current.muteRemoteAudio(play = false)
        current.remoteParticipants.values.forEach { participant ->
            participant.trackPublications.values.forEach { pub ->
                if (pub.kind == Track.Kind.AUDIO) {
                    runCatching { (pub as? RemoteTrackPublication)?.setSubscribed(false) }
                }
            }
        }
    }

    private fun hasBackFlash(): Boolean {
        return runCatching {
            val manager = app.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            manager.cameraIdList.any { id ->
                val chars = manager.getCameraCharacteristics(id)
                chars.get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_BACK &&
                    chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
            }
        }.getOrDefault(false)
    }
}
