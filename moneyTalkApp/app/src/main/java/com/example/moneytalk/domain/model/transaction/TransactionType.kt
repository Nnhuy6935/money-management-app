package com.example.moneytalk.domain.model.transaction

import kotlinx.serialization.Serializable

@Serializable
data class TransactionType(
    val id: String,
    val code: String,
    val name: String,
    val flow: TransactionFlow,
    val isDefault: Boolean,
) {
}