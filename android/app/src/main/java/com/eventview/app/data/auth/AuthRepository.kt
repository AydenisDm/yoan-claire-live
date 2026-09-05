package com.eventview.app.data.auth

import com.eventview.app.data.api.AuthSessionDto
import com.eventview.app.data.api.EmailSignInRequest
import com.eventview.app.data.api.EmailSignUpRequest
import com.eventview.app.data.api.EventViewApi
import com.eventview.app.data.api.NetworkModule
import com.eventview.core.AuthErrors
import com.eventview.core.AuthForm
import com.eventview.core.AuthSession
import com.eventview.core.AuthSetupStatus
import com.eventview.core.AuthUser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import retrofit2.Response

class AuthRepository(
    private val api: EventViewApi,
    private val store: SessionStore,
    private val json: Json = NetworkModule.json,
) {
    val session: Flow<AuthSession?> = store.session

    suspend fun status(): AuthSetupStatus = withContext(Dispatchers.IO) {
        val dto = api.authStatus()
        AuthSetupStatus(
            ok = dto.ok,
            code = dto.code,
            message = dto.message,
            persist = dto.persist,
            emailPassword = dto.emailPassword,
            social = dto.social,
            secretStable = dto.secretStable,
        )
    }

    suspend fun signIn(email: String, password: String): Result<AuthSession> = withContext(Dispatchers.IO) {
        runCatching {
            val response = api.signInEmail(EmailSignInRequest(email.trim(), password))
            parseSession(response, "Could not sign in.")
        }.fold(
            onSuccess = { Result.success(it) },
            onFailure = { Result.failure(it) },
        )
    }

    suspend fun register(name: String, email: String, password: String): Result<AuthSession> =
        withContext(Dispatchers.IO) {
            runCatching {
                val display = AuthForm.displayName(name, email)
                val response = api.signUpEmail(
                    EmailSignUpRequest(
                        email = email.trim(),
                        password = password,
                        name = display,
                    ),
                )
                parseSession(response, "Could not create the account.")
            }.fold(
                onSuccess = { Result.success(it) },
                onFailure = { Result.failure(it) },
            )
        }

    suspend fun refresh(): AuthSession? = withContext(Dispatchers.IO) {
        runCatching {
            val response = api.getSession()
            if (!response.isSuccessful) return@runCatching null
            val body = response.body() ?: return@runCatching null
            val session = body.toSession(existingToken = store.token()) ?: return@runCatching null
            store.save(session)
            session
        }.getOrNull()
    }

    suspend fun signOut() = withContext(Dispatchers.IO) {
        runCatching { api.signOut() }
        store.clear()
    }

    private suspend fun parseSession(
        response: Response<AuthSessionDto>,
        fallback: String,
    ): AuthSession {
        val body = response.body()
        if (!response.isSuccessful) {
            val raw = response.errorBody()?.string().orEmpty()
            val error = runCatching { json.decodeFromString<AuthSessionDto>(raw) }.getOrNull()
            val message = AuthErrors.describe(
                message = error?.message ?: body?.message,
                code = error?.code ?: body?.code,
                fallback = fallback,
            )
            throw AuthException(message, error?.code ?: body?.code)
        }
        val session = body?.toSession(existingToken = store.token())
            ?: throw AuthException(fallback, body?.code)
        store.save(session)
        return session
    }
}

class AuthException(message: String, val code: String? = null) : Exception(message)

private fun AuthSessionDto.toSession(existingToken: String?): AuthSession? {
    val user = user ?: return null
    val id = user.id ?: return null
    val token = token ?: session?.token ?: existingToken
    return AuthSession(
        user = AuthUser(id = id, email = user.email, name = user.name),
        token = token,
    )
}
