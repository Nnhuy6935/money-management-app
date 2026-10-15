package com.example.moneytalk.data.repository.transaction

import com.example.moneytalk.core.network.BaseRepository
import com.example.moneytalk.core.network.NetworkResult
import com.example.moneytalk.core.network.PaginatedResponse
import com.example.moneytalk.core.network.RetrofitClient
import com.example.moneytalk.core.storage.TokenManager
import com.example.moneytalk.data.remote.transaction.TransactionService
import com.example.moneytalk.domain.model.transaction.Transaction
import com.example.moneytalk.domain.model.transaction.TransactionListRequest

class TransactionRepository(private val tokenManager: TokenManager) : BaseRepository() {
    private val transactionService = RetrofitClient.create(TransactionService::class.java)

    suspend fun getMyTransaction(transactionRequest: TransactionListRequest): NetworkResult<PaginatedResponse<Transaction>> {
        return safeApiCall {
            transactionService.getMyTransaction(request = transactionRequest)
        }
    }
}
