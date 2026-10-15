package com.example.moneytalk.domain.model.transaction

import kotlinx.serialization.Serializable

@Serializable
data class Transaction(
    val id: String,
    val amount: String,
    val description: String,
    val flow: TransactionFlow, // Assuming this should be the enum TransactionFlow
    val type: TransactionType,
    val imageKey: String? = null,
    val imageUrl: String? = null,
    val contentType: String? = null,
    val fileSize: Int? = null,
    val createdAt: String,
    val updatedAt: String,
)
