package com.example.moneytalk.data.repository.auth

import com.example.moneytalk.core.network.BaseRepository
import com.example.moneytalk.core.network.NetworkResult
import com.example.moneytalk.core.network.RetrofitClient
import com.example.moneytalk.data.remote.auth.AuthService
import com.example.moneytalk.domain.model.auth.LoginRequest
import com.example.moneytalk.domain.model.auth.LoginResponse

class AuthRepository : BaseRepository() {
    private val authService = RetrofitClient.create(AuthService::class.java)

    suspend fun login(email: String, password: String): NetworkResult<LoginResponse> {
        return safeApiCall {
            authService.login(LoginRequest(email, password))
        }
    }
    suspend fun register(email: String, password: String) : NetworkResult<LoginResponse>{
        return safeApiCall {
            authService.register(
                LoginRequest(email, password)
            )
        }
    }
}
