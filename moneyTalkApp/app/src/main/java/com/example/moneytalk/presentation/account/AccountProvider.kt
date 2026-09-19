package com.example.moneytalk.presentation.account

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.lifecycle.viewmodel.compose.viewModel

val LocalAccountManager = compositionLocalOf<AccountViewModel> {
    error("No AccountViewModel provided")
}

@Composable
fun AccountProvider(content: @Composable () -> Unit) {
    val accountViewModel: AccountViewModel = viewModel()
    
    CompositionLocalProvider(LocalAccountManager provides accountViewModel) {
        content()
    }
}
