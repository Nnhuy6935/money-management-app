package com.example.moneytalk

import android.app.Application
import com.example.moneytalk.core.storage.TokenManager

class MoneyTalkApp : Application() {

    lateinit var tokenManager: TokenManager
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this
        tokenManager = TokenManager(applicationContext)
    }

    companion object {
        lateinit var instance: MoneyTalkApp
            private set
    }
}
