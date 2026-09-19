package com.example.moneytalk.core.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue

class ToastState {
    var toastData by mutableStateOf<ToastData?>(null)
        private set

    fun show(message: String) {
        toastData = ToastData(message, ToastType.INFO)
    }

    fun success(message: String){
        toastData = ToastData(message, ToastType.SUCCESS)
    }

    fun error(message: String){
        toastData = ToastData(message, ToastType.FAILED)
    }

    fun dismissToast() {
        toastData = null
    }
}

@Composable
fun rememberToastState(): ToastState {
    return remember { ToastState() }
}
