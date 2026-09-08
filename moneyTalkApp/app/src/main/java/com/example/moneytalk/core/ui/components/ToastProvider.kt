package com.example.moneytalk.core.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf

val LocalToastManager = compositionLocalOf<ToastState> {
    error("No ToastState provided")
}

@Composable
fun ToastProvider(content: @Composable () -> Unit) {
    val toastState = rememberToastState()
    
    CompositionLocalProvider(LocalToastManager provides toastState) {
        content()
        CustomToast(
            toastData = toastState.toastData,
            onDismiss = { toastState.dismissToast() }
        )
    }
}

/// how to use
// ``` val toastManager = LocalToastManager.current
/// toastManager.show("This is a toast message")
/// toastManager.succes("Login success")
/// toastManager.error("Login failed")```
