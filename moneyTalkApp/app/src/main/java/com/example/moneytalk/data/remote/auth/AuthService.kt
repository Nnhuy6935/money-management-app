package com.example.moneytalk.data.remote.auth

import com.example.moneytalk.domain.model.auth.LoginRequest
import com.example.moneytalk.domain.model.auth.LoginResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthService {
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse> // Unit hoặc model response của bạn
    @POST("api/auth/register")
    suspend fun register(@Body request: LoginRequest) : Response<LoginResponse>
}
