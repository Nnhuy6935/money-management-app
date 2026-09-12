package com.example.moneytalk.presentation.splash

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.example.moneytalk.MoneyTalkApp
import kotlinx.coroutines.flow.first

@Composable
fun SplashScreen(
    onNavigateToLogin: () -> Unit,
    onNavigateToHome: () -> Unit
) {
    LaunchedEffect(Unit) {
        val token = MoneyTalkApp.instance.tokenManager.accessToken.first()
        if (token != null) {
            onNavigateToHome()
        } else {
            onNavigateToLogin()
        }
    }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}