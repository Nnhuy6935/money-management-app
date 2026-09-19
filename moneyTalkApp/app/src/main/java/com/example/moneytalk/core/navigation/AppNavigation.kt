package com.example.moneytalk.core.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.moneytalk.presentation.account.LocalAccountManager
import com.example.moneytalk.presentation.auth.login.LoginScreen
import com.example.moneytalk.presentation.auth.signup.SignupScreen
import com.example.moneytalk.presentation.dashboard.DashboardScreen
import com.example.moneytalk.presentation.splash.SplashScreen

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val accountManager = LocalAccountManager.current

    NavHost(
        navController = navController,
        startDestination = "splash"
    ) {
        composable("splash") {
            SplashScreen(
                onNavigateToLogin = {
                    navController.navigate("login") {
                        popUpTo("splash") { inclusive = true }
                    }
                },
                onNavigateToHome = {
                    accountManager.getUserInfo(
                        onComplete = { success ->
                            if (success) {
                                navController.navigate("dashboard") {
                                    popUpTo("splash") { inclusive = true }
                                }
                            } else {
                                navController.navigate("login") {
                                    popUpTo("splash") { inclusive = true }
                                }
                            }
                        }
                    )
                }
            )
        }

        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    accountManager.getUserInfo(
                        onComplete = {
                            navController.navigate("dashboard") {
                                popUpTo("login") { inclusive = true }
                            }
                        }
                    )
                },
                onSignUpClick = {
                    navController.navigate("signin")
                }
            )
        }

        composable("dashboard") {
            DashboardScreen(
                onLogout = {
                    navController.navigate("login") {
                        popUpTo("dashboard") { inclusive = true }
                    }
                }
            )
        }

        composable("signin") {
            SignupScreen(
                onSignupSuccess = {
                    accountManager.getUserInfo(
                        onComplete = {
                            navController.navigate("dashboard") {
                                popUpTo("login") { inclusive = true }
                            }
                        }
                    )
                },
                onBackToLogin = {
                    navController.popBackStack()
                }
            )
        }
    }
}


