package com.example.moneytalk.data.remote.auth

import com.example.moneytalk.domain.model.auth.LoginRequest
import com.example.moneytalk.domain.model.auth.LoginResponse
import com.example.moneytalk.domain.model.user.User
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Headers
import retrofit2.http.POST

interface AuthService {
    @Headers("No-Authentication: true")
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @Headers("No-Authentication: true")
    @POST("api/auth/register")
    suspend fun register(@Body request: LoginRequest) : Response<LoginResponse>
    @POST("api/auth/logout")
    suspend fun logout() : Response<Unit>
    @GET("api/auth/me")
    suspend fun getMe() : Response<User>
}
