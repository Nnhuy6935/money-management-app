package com.example.moneytalk

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.example.moneytalk.core.navigation.AppNavigation
import com.example.moneytalk.core.ui.theme.MoneyTalkTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MoneyTalkTheme {
                AppNavigation()
            }
        }
    }
}
