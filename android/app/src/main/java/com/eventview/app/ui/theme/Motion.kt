package com.eventview.app.ui.theme

import android.provider.Settings
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavBackStackEntry

object EvMotion {
    const val Fast = 180
    const val Base = 220
    const val Slow = 280

    /** Confident, no bounce / overshoot. */
    val Ease: Easing = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f)

    fun <T> spec(ms: Int = Base) = tween<T>(durationMillis = ms, easing = Ease)

    fun enter(reduce: Boolean): EnterTransition {
        if (reduce) return fadeIn(tween(80))
        return fadeIn(spec(Base)) + slideInHorizontally(spec(Slow)) { it / 18 }
    }

    fun exit(reduce: Boolean): ExitTransition {
        if (reduce) return fadeOut(tween(80))
        return fadeOut(spec(Fast)) + slideOutHorizontally(spec(Base)) { -it / 22 }
    }

    fun popEnter(reduce: Boolean): EnterTransition {
        if (reduce) return fadeIn(tween(80))
        return fadeIn(spec(Base)) + slideInHorizontally(spec(Slow)) { -it / 18 }
    }

    fun popExit(reduce: Boolean): ExitTransition {
        if (reduce) return fadeOut(tween(80))
        return fadeOut(spec(Fast)) + slideOutHorizontally(spec(Base)) { it / 22 }
    }
}

@Composable
fun rememberReduceMotion(): Boolean {
    val context = LocalContext.current
    return remember {
        val resolver = context.contentResolver
        val animator = Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
        val transition = Settings.Global.getFloat(resolver, Settings.Global.TRANSITION_ANIMATION_SCALE, 1f)
        animator == 0f || transition == 0f
    }
}

fun AnimatedContentTransitionScope<NavBackStackEntry>.evEnter(reduce: Boolean) = EvMotion.enter(reduce)
fun AnimatedContentTransitionScope<NavBackStackEntry>.evExit(reduce: Boolean) = EvMotion.exit(reduce)
fun AnimatedContentTransitionScope<NavBackStackEntry>.evPopEnter(reduce: Boolean) = EvMotion.popEnter(reduce)
fun AnimatedContentTransitionScope<NavBackStackEntry>.evPopExit(reduce: Boolean) = EvMotion.popExit(reduce)
