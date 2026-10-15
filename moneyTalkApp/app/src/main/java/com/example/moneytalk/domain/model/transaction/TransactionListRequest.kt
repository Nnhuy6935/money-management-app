package com.example.moneytalk.domain.model.transaction

import kotlinx.serialization.Serializable

enum class TransactionFlow {
    income,
    expense,
}

@Serializable
data class TransactionListRequest(
    val date: String? = null,
    val from: String? = null,
    val to: String? = null,
    val flow: TransactionFlow? = null,
    val typeId: String? = null,
    val page: Int? = null,
    val limit: Int? = null,
)
