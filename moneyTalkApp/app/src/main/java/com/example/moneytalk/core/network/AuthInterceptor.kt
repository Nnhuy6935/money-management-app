package com.example.moneytalk.core.network

import com.example.moneytalk.MoneyTalkApp
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val requestBuilder = originalRequest.newBuilder()

        // Kiểm tra xem request có yêu cầu bỏ qua Token không
        if (originalRequest.header("No-Authentication") == null) {
            val token = runBlocking {
                MoneyTalkApp.instance.tokenManager.accessToken.first()
            }
            
            token?.let {
                requestBuilder.addHeader("Authorization", "Bearer $it")
            }
        } else {
            // Xóa header tạm thời này trước khi gửi tới server
            requestBuilder.removeHeader("No-Authentication")
        }

        return chain.proceed(requestBuilder.build())
    }
}
