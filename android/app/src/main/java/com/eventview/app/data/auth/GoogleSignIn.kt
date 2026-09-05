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
        // Do not use FLAG_ACTIVITY_NO_HISTORY — Chrome then drops the
        // eventview-debug:// / intent:// return into a dead task.
        tabs.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        tabs.launchUrl(context, uri)
    }

    fun tokenFrom(intent: Intent?): String? {
        val data = intent?.data ?: return null
        val query = data.getQueryParameter(AndroidAuth.TOKEN_QUERY)
        return AndroidAuth.tokenFromParts(
            scheme = data.scheme,
            host = data.host,
            queryToken = query,
            fragment = data.fragment,
        )
    }
}
