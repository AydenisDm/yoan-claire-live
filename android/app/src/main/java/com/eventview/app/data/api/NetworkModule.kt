package com.eventview.app.data.api

import com.eventview.app.BuildConfig
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.JavaNetCookieJar
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.net.CookieManager
import java.net.CookiePolicy
import java.util.concurrent.TimeUnit

fun interface SessionTokenProvider {
    fun token(): String?
}

fun interface SessionTokenSink {
    fun remember(token: String)
}

object NetworkModule {
    val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        explicitNulls = false
    }

    fun createApi(
        baseUrl: String = BuildConfig.API_BASE_URL,
        tokenProvider: SessionTokenProvider,
        tokenSink: SessionTokenSink? = null,
    ): EventViewApi {
        val cookieManager = CookieManager().apply { setCookiePolicy(CookiePolicy.ACCEPT_ALL) }
        val origin = baseUrl.trimEnd('/')
        val headers = Interceptor { chain ->
            val original = chain.request()
            val builder = original.newBuilder()
                .header("Accept", "application/json")
                .header("Origin", origin)
                .header("X-EventView-Client", "android")
            if (original.header("Content-Type") == null && original.body != null) {
                builder.header("Content-Type", "application/json")
            }
            val token = tokenProvider.token()
            if (!token.isNullOrBlank() && original.header("Authorization") == null) {
                builder.header("Authorization", "Bearer $token")
            }
            chain.proceed(builder.build())
        }
        val cookies = Interceptor { chain ->
            val response = chain.proceed(chain.request())
            if (tokenSink != null) {
                response.headers("set-cookie").forEach { header ->
                    val pair = header.substringBefore(";")
                    val name = pair.substringBefore("=")
                    val value = pair.substringAfter("=", "")
                    if (name.contains("session_token", ignoreCase = true) && value.isNotBlank()) {
                        tokenSink.remember(value)
                    }
                }
            }
            response
        }
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BASIC
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
        val client = OkHttpClient.Builder()
            .cookieJar(JavaNetCookieJar(cookieManager))
            .addInterceptor(headers)
            .addInterceptor(cookies)
            .addInterceptor(logging)
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(25, TimeUnit.SECONDS)
            .writeTimeout(25, TimeUnit.SECONDS)
            .build()
        val root = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        return Retrofit.Builder()
            .baseUrl(root)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(EventViewApi::class.java)
    }
}
