package com.example.moneytalk.presentation.dashboard

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.ui.graphics.vector.ImageVector


sealed class BottomNavItem(val route: String, val label: String, val icon: ImageVector) {
    object Home : BottomNavItem("home_tab", "Home", Icons.Default.Home)
    object Statistic: BottomNavItem("statistic_tab", "Statistic", Icons.Default.BarChart)
    object Account : BottomNavItem("account_tab", "Account", Icons.Default.Person)
}