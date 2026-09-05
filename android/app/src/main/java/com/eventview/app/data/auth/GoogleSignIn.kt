package com.eventview.app.data.auth

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import com.eventview.core.AndroidAuth

object GoogleSignIn {
    fun launch(context: Context, apiBase: String, scheme: String) {
        val uri = Uri.parse(AndroidAuth.startUrl(apiBase, scheme))
        val tabs = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
            .setUrlBarHidingEnabled(true)
            .build()
        tabs.intent.addFlags(Intent.FLAG_ACTIVITY_NO_HISTORY)
        tabs.launchUrl(context, uri)
    }

    fun tokenFrom(intent: Intent?): String? {
        val data = intent?.data ?: return null
        return AndroidAuth.parseCallbackToken(
            scheme = data.scheme,
            host = data.host,
            token = data.getQueryParameter(AndroidAuth.TOKEN_QUERY),
        )
    }
}
