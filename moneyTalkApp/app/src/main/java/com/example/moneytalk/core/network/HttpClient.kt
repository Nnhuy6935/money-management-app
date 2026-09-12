package com.example.moneytalk.core.network

import retrofit2.Response
import retrofit2.http.*

interface GenericApiService {
    @GET("{path}")
    suspend fun get(
        @Path("path", encoded = true) path: String,
        @QueryMap params: Map<String, String> = emptyMap(),
        @HeaderMap headers: Map<String, String> = emptyMap()
    ): Response<Unit>

    @POST("{path}")
    suspend fun post(
        @Path("path", encoded = true) path: String,
        @Body body: Any,
        @HeaderMap headers: Map<String, String> = emptyMap()
    ): Response<Unit>

    @PUT("{path}")
    suspend fun put(
        @Path("path", encoded = true) path: String,
        @Body body: Any,
        @HeaderMap headers: Map<String, String> = emptyMap()
    ): Response<Unit>

    @PATCH("{path}")
    suspend fun patch(
        @Path("path", encoded = true) path: String,
        @Body body: Any,
        @HeaderMap headers: Map<String, String> = emptyMap()
    ): Response<Unit>

    @DELETE("{path}")
    suspend fun delete(
        @Path("path", encoded = true) path: String,
        @HeaderMap headers: Map<String, String> = emptyMap()
    ): Response<Unit>
}

/**
 * Một class tiện ích để gọi API nhanh chóng.
 */
object HttpClient {
    private val api = RetrofitClient.create(GenericApiService::class.java)

    suspend fun get(
        path: String, 
        params: Map<String, String> = emptyMap(),
        headers: Map<String, String> = emptyMap()
    ) = api.get(path, params, headers)

    suspend fun post(
        path: String, 
        body: Any,
        headers: Map<String, String> = emptyMap()
    ) = api.post(path, body, headers)

    suspend fun put(
        path: String, 
        body: Any,
        headers: Map<String, String> = emptyMap()
    ) = api.put(path, body, headers)

    suspend fun patch(
        path: String, 
        body: Any,
        headers: Map<String, String> = emptyMap()
    ) = api.patch(path, body, headers)

    suspend fun delete(
        path: String,
        headers: Map<String, String> = emptyMap()
    ) = api.delete(path, headers)
}
