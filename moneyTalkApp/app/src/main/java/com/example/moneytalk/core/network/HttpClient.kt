package com.example.moneytalk.core.network

import retrofit2.Response
import retrofit2.http.*

interface GenericApiService {
    @GET("{path}")
    suspend fun get(
        @Path("path", encoded = true) path: String,
        @QueryMap params: Map<String, String> = emptyMap()
    ): Response<Unit> // Using Unit as a placeholder, real usage usually uses specific models

    @POST("{path}")
    suspend fun post(
        @Path("path", encoded = true) path: String,
        @Body body: Any
    ): Response<Unit>

    @PUT("{path}")
    suspend fun put(
        @Path("path", encoded = true) path: String,
        @Body body: Any
    ): Response<Unit>

    @PATCH("{path}")
    suspend fun patch(
        @Path("path", encoded = true) path: String,
        @Body body: Any
    ): Response<Unit>

    @DELETE("{path}")
    suspend fun delete(
        @Path("path", encoded = true) path: String
    ): Response<Unit>
}

/**
 * Một class tiện ích để gọi API nhanh chóng.
 * Lưu ý: Trong thực tế, bạn nên định nghĩa các Interface cụ thể cho từng Feature
 * để tận dụng tối đa sức mạnh của Retrofit và Type Safety.
 */
object HttpClient {
    private val api = RetrofitClient.create(GenericApiService::class.java)

    suspend fun get(path: String, params: Map<String, String> = emptyMap()) = api.get(path, params)
    suspend fun post(path: String, body: Any) = api.post(path, body)
    suspend fun put(path: String, body: Any) = api.put(path, body)
    suspend fun patch(path: String, body: Any) = api.patch(path, body)
    suspend fun delete(path: String) = api.delete(path)
}
