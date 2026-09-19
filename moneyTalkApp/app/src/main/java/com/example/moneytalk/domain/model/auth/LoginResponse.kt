package com.example.moneytalk.domain.model.auth

import kotlinx.serialization.Serializable

@Serializable
data class LoginResponse (
    val accessToken: String,
)