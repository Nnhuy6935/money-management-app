package com.example.moneytalk.core.network

import kotlinx.serialization.Serializable

@Serializable
data class PaginatedResponse<T>(
    val data: List<T>,
    val meta: PaginationMeta
){
    companion object{
        fun <T> empty(): PaginatedResponse<T> {
            return PaginatedResponse(
                data = emptyList(),
                meta = PaginationMeta(0, 0, 0, 0)
            )
        }
    }

}

@Serializable
data class PaginationMeta(
    val total: Int,
    val page: Int,
    val limit: Int,
    val totalPages: Int
)
