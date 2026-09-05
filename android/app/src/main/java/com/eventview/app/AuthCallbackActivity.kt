package com.eventview.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import com.eventview.app.data.auth.GoogleSignIn

/**
 * Thin exported activity for Custom Tabs / Chrome `intent://` returns.
 * Forwards the session token into [MainActivity] and finishes immediately.
 */
class AuthCallbackActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        deliver(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        deliver(intent)
    }

    private fun deliver(incoming: Intent?) {
        val token = GoogleSignIn.tokenFrom(incoming)
        if (token != null) {
            (application as EventViewApplication).container.offerGoogleToken(token)
        }
        startActivity(
            Intent(this, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = incoming?.data
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_NEW_TASK
            },
        )
        finish()
    }
}
