package com.eventview.app.data.auth

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.eventview.core.AuthSession
import com.eventview.core.AuthUser
import com.eventview.core.LiveConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.UUID

private val Context.dataStore by preferencesDataStore("eventview-session")

class SessionStore(private val context: Context) {
    private val tokenKey = stringPreferencesKey("session_token")
    private val userIdKey = stringPreferencesKey("user_id")
    private val emailKey = stringPreferencesKey("email")
    private val nameKey = stringPreferencesKey("name")
    private val guestKey = stringPreferencesKey("guest_id")

    @Volatile
    private var cachedToken: String? = null

    val session: Flow<AuthSession?> = context.dataStore.data.map { prefs ->
        cachedToken = prefs[tokenKey]
        val id = prefs[userIdKey] ?: return@map null
        AuthSession(
            user = AuthUser(
                id = id,
                email = prefs[emailKey],
                name = prefs[nameKey],
            ),
            token = prefs[tokenKey],
        )
    }

    fun cachedToken(): String? = cachedToken

    fun rememberToken(token: String) {
        if (token.isNotBlank()) cachedToken = token
    }

    suspend fun token(): String? {
        val live = context.dataStore.data.first()[tokenKey]
        cachedToken = live
        return live
    }

    suspend fun save(session: AuthSession) {
        cachedToken = session.token
        context.dataStore.edit { prefs ->
            prefs[userIdKey] = session.user.id
            session.user.email?.let { prefs[emailKey] = it }
            session.user.name?.let { prefs[nameKey] = it }
            val token = session.token
            if (token.isNullOrBlank()) {
                prefs.remove(tokenKey)
            } else {
                prefs[tokenKey] = token
            }
        }
    }

    suspend fun clear() {
        cachedToken = null
        context.dataStore.edit { prefs ->
            prefs.remove(tokenKey)
            prefs.remove(userIdKey)
            prefs.remove(emailKey)
            prefs.remove(nameKey)
        }
    }

    suspend fun guestIdentity(): String {
        val existing = context.dataStore.data.first()[guestKey]
        if (existing != null && LiveConfig.isValidGuestIdentity(existing)) return existing
        val created = LiveConfig.newGuestIdentity(UUID.randomUUID().toString().replace("-", ""))
        context.dataStore.edit { it[guestKey] = created }
        return created
    }
}
