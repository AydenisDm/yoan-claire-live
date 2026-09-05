package com.eventview.app.data.archive

import android.content.Context
import com.eventview.core.ArchiveSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class ArchiveStore(context: Context) {
    private val file = File(context.filesDir, "archive-sessions.json")
    private val mutex = Mutex()
    private val _items = MutableStateFlow<List<ArchiveSession>>(emptyList())
    val items: StateFlow<List<ArchiveSession>> = _items

    suspend fun load() = withContext(Dispatchers.IO) {
        mutex.withLock {
            _items.value = readLocked()
        }
    }

    suspend fun add(session: ArchiveSession) = withContext(Dispatchers.IO) {
        mutex.withLock {
            val next = listOf(session) + readLocked()
            writeLocked(next)
            _items.value = next
        }
    }

    suspend fun delete(id: String) = withContext(Dispatchers.IO) {
        mutex.withLock {
            val current = readLocked()
            current.firstOrNull { it.id == id }?.videoPath?.let { path ->
                runCatching { File(path).delete() }
            }
            val next = current.filterNot { it.id == id }
            writeLocked(next)
            _items.value = next
        }
    }

    private fun readLocked(): List<ArchiveSession> {
        if (!file.exists()) return emptyList()
        return runCatching {
            val array = JSONArray(file.readText())
            buildList {
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    add(
                        ArchiveSession(
                            id = obj.getString("id"),
                            title = obj.optString("title"),
                            startedAt = obj.optLong("startedAt"),
                            endedAt = obj.optLong("endedAt"),
                            durationMs = obj.optLong("durationMs"),
                            peakViewers = obj.optInt("peakViewers"),
                            videoPath = obj.optString("videoPath").ifBlank { null },
                        ),
                    )
                }
            }
        }.getOrElse { emptyList() }
    }

    private fun writeLocked(items: List<ArchiveSession>) {
        val array = JSONArray()
        items.forEach { session ->
            array.put(
                JSONObject().apply {
                    put("id", session.id)
                    put("title", session.title)
                    put("startedAt", session.startedAt)
                    put("endedAt", session.endedAt)
                    put("durationMs", session.durationMs)
                    put("peakViewers", session.peakViewers)
                    put("videoPath", session.videoPath ?: "")
                },
            )
        }
        file.writeText(array.toString())
    }
}
