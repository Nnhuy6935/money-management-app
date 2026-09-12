package com.example.moneytalk.domain.model.user

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val email: String,
    val name: String? = null,
    val role: String,
    val createdAt: String,
    val updatedAt: String,
    )
