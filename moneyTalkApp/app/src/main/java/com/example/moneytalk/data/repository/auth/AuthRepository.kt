package com.example.moneytalk.data.repository.auth

import com.example.moneytalk.core.network.BaseRepository
import com.example.moneytalk.core.network.NetworkResult
import com.example.moneytalk.core.network.RetrofitClient
import com.example.moneytalk.core.storage.TokenManager
import com.example.moneytalk.data.remote.auth.AuthService
import com.example.moneytalk.domain.model.auth.LoginRequest
import com.example.moneytalk.domain.model.auth.LoginResponse
import com.example.moneytalk.domain.model.user.User

class AuthRepository(private val tokenManager: TokenManager) : BaseRepository() {
    private val authService = RetrofitClient.create(AuthService::class.java)

    suspend fun login(email: String, password: String): NetworkResult<LoginResponse> {
        val result = safeApiCall {
            authService.login(LoginRequest(email, password))
        }
        if (result is NetworkResult.Success) {
            tokenManager.saveAccessToken(result.data.accessToken)
        }
        return result
    }

    suspend fun register(email: String, password: String): NetworkResult<LoginResponse> {
        val result = safeApiCall {
            authService.register(LoginRequest(email, password))
        }
        if (result is NetworkResult.Success) {
            tokenManager.saveAccessToken(result.data.accessToken)
        }
        return result
    }

    suspend fun logout(): NetworkResult<Unit> {
        val result = safeApiCall {
            authService.logout()
        }
        if (result is NetworkResult.Success) {
            tokenManager.clearToken()
        }
        return result
    }

    suspend fun getMe(): NetworkResult<User> {
        return safeApiCall {
            authService.getMe()
        }
    }
}
