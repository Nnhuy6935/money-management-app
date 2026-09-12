package com.example.moneytalk.presentation.account

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import com.example.moneytalk.MoneyTalkApp
import com.example.moneytalk.R
import com.example.moneytalk.core.ui.components.LocalToastManager
import kotlinx.coroutines.launch

@Composable
fun AccountScreen(onLogout: () -> Unit) {
    val accountManager = LocalAccountManager.current
    val toastManager = LocalToastManager.current
    val currentUser by accountManager.currentUser.collectAsState()
    val scope = rememberCoroutineScope()

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = "Account Screen")
            Text(text = "Email: ${currentUser?.email ?: "N/A"}")
            Text(text = "Role: ${currentUser?.role ?: "N/A"}")
            
            Button(onClick = {
                scope.launch {
                     accountManager.logout(
                         onSuccess = onLogout,
                         onError =  { message -> toastManager.error(message)}
                     )
                }
            }) {
                Text(stringResource(R.string.account_logout))
            }
        }
    }
}
