package com.eventview.app.data.hub

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.eventview.core.Crowd
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.hubStore by preferencesDataStore("eventview-hub")

class HubStore(private val context: Context) {
    val picks: Flow<Map<String, String>> = context.hubStore.data.map { prefs ->
        Crowd.feedbackGroups.associate { group ->
            val key = stringPreferencesKey(group.kind)
            group.kind to (prefs[key] ?: "")
        }.filterValues { it.isNotEmpty() }
    }

    suspend fun choose(kind: String, choice: String) {
        if (!Crowd.isFeedbackChoice(kind, choice)) return
        context.hubStore.edit { prefs ->
            prefs[stringPreferencesKey(kind)] = choice
        }
    }
}
