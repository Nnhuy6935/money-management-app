package com.example.moneytalk.core.network

import kotlinx.serialization.Serializable

@Serializable
data class ErrorResponse(
    val message: String? = null,
    val error: String? = null,
    val statusCode: Int? = null
)
