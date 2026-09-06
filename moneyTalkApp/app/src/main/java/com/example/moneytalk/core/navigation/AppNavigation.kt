package com.example.moneytalk.core.navigation

import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.moneytalk.R
import com.example.moneytalk.presentation.auth.login.LoginScreen
import com.example.moneytalk.presentation.auth.login.SignupScreen

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "login"
    ) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("home") {
                        popUpTo("login") { inclusive = false }
                    }
                },
                onSignUpClick = {
                  navController.navigate("signin"){
                      popUpTo("login") { inclusive = false  }
                  }
                }
            )
        }

        composable("home") {
            HomeScreen()
        }

        composable("signin") {
            SignupScreen(
                onSignupSuccess = {
                    navController.navigate("home"){
                        popUpTo("home") { inclusive = false }
                    }
                },
                onBackToLogin = {
                    navController.navigate("login"){
                        popUpTo("login"){
                            inclusive = false
                        }
                    }
                }
            )
        }
    }



}

@Composable
fun HomeScreen() {
    Scaffold{
            innerPadding ->

        Text(
            text = stringResource(R.string.welcome_home)
        )
    }
}
