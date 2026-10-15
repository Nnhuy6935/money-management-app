package com.example.moneytalk.data.remote.transaction

import com.example.moneytalk.core.network.PaginatedResponse
import com.example.moneytalk.domain.model.transaction.Transaction
import com.example.moneytalk.domain.model.transaction.TransactionListRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET

interface TransactionService {
    @GET("api/transaction/me")
    suspend fun getMyTransaction(@Body request: TransactionListRequest): Response<PaginatedResponse<Transaction>>
}
