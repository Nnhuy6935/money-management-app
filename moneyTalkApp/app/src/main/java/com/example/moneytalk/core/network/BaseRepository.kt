package com.example.moneytalk.core.network

import retrofit2.Response

/**
 * Base class cho các Repository để xử lý kết quả API chung.
 */
abstract class BaseRepository {

    suspend fun <T> safeApiCall(apiCall: suspend () -> Response<T>): NetworkResult<T> {
        return try {
            val response = apiCall()
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    NetworkResult.Success(body)
                } else {
                    NetworkResult.Error("Empty response body")
                }
            } else {
                NetworkResult.Error(
                    message = response.message() ?: "Unknown Error",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network Exception")
        }
    }
}
