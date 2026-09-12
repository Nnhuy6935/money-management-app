package com.example.moneytalk.core.network

import kotlinx.serialization.json.decodeFromJsonElement
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
                } else if (response.code() == 204 || response.code() == 200) {
                    // Success with no body (e.g. Logout 204)
                    @Suppress("UNCHECKED_CAST")
                    NetworkResult.Success(Unit as T)
                } else {
                    NetworkResult.Error("Empty response body")
                }
            } else {
                val errorBody = response.errorBody()?.string()
                val errorMessage = parseErrorMessage(errorBody) ?: response.message() ?: "Unknown Error"
                NetworkResult.Error(
                    message = errorMessage,
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network Exception")
        }
    }

    private fun parseErrorMessage(errorBody: String?): String? {
        if (errorBody == null) return null
        return try {
            val jsonElement = RetrofitClient.json.parseToJsonElement(errorBody)
            val errorResponse = RetrofitClient.json.decodeFromJsonElement<ErrorResponse>(jsonElement)
            errorResponse.message ?: errorResponse.error
        } catch (e: Exception) {
            null
        }
    }
}
