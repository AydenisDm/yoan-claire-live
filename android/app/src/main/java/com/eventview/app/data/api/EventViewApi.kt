package com.eventview.app.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface EventViewApi {
    @GET("api/live")
    suspend fun liveSetup(): LiveSetupDto

    @POST("api/live")
    suspend fun mintLiveToken(@Body body: LiveTokenRequest): Response<LiveTokenDto>

    @GET("api/auth/status")
    suspend fun authStatus(): AuthSetupDto

    @POST("api/auth/sign-in/email")
    suspend fun signInEmail(@Body body: EmailSignInRequest): Response<AuthSessionDto>

    @POST("api/auth/sign-up/email")
    suspend fun signUpEmail(@Body body: EmailSignUpRequest): Response<AuthSessionDto>

    @GET("api/auth/get-session")
    suspend fun getSession(): Response<AuthSessionDto>

    @POST("api/auth/sign-out")
    suspend fun signOut(): Response<AuthErrorDto>
}
