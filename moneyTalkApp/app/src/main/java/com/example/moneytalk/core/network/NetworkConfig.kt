package com.example.moneytalk.core.network

import com.example.moneytalk.BuildConfig

object NetworkConfig {
    /**
     * Tự động lấy URL từ BuildConfig dựa trên môi trường Debug/Release
     */
    const val BASE_URL = BuildConfig.BASE_URL
}
