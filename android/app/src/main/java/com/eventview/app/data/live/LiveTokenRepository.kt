package com.eventview.app.data.live

import com.eventview.app.data.api.EventViewApi
import com.eventview.app.data.api.LiveTokenRequest
import com.eventview.app.data.api.NetworkModule
import com.eventview.core.LiveFailure
import com.eventview.core.LiveRole
import com.eventview.core.LiveSetupStatus
import com.eventview.core.LiveToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class LiveTokenRepository(
    private val api: EventViewApi,
) {
    suspend fun setup(): LiveSetupStatus = withContext(Dispatchers.IO) {
        runCatching {
            val dto = api.liveSetup()
            LiveSetupStatus(configured = dto.configured, room = dto.room)
        }.getOrElse { LiveSetupStatus(configured = false) }
    }

    suspend fun mint(role: LiveRole, identity: String? = null, password: String? = null): LiveToken =
        withContext(Dispatchers.IO) {
            val request = LiveTokenRequest(
                role = if (role == LiveRole.HOST) "host" else "guest",
                identity = if (role == LiveRole.GUEST) identity else null,
                password = if (role == LiveRole.HOST) password?.ifBlank { null } else null,
            )
            val response = try {
                api.mintLiveToken(request)
            } catch (_: Exception) {
                throw LiveException(LiveFailure.network())
            }
            val body = response.body()
            if (!response.isSuccessful || body?.token.isNullOrBlank() || body.url.isNullOrBlank()) {
                val error = body?.error ?: runCatching {
                    val raw = response.errorBody()?.string().orEmpty()
                    NetworkModule.json.decodeFromString<com.eventview.app.data.api.LiveTokenDto>(raw).error
                }.getOrNull()
                throw LiveException(LiveFailure.fromHttp(response.code(), error))
            }
            LiveToken(
                token = body.token!!,
                url = body.url!!,
                identity = body.identity.orEmpty(),
                room = body.room.orEmpty(),
                configured = body.configured,
            )
        }
}

class LiveException(val failure: LiveFailure) : Exception(failure.message)
