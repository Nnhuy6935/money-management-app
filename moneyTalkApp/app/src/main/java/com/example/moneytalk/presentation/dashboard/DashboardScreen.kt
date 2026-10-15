package com.example.moneytalk.presentation.dashboard

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.moneytalk.core.ui.theme.MoneyTalkTheme
import com.example.moneytalk.core.ui.theme.extraColors
import com.example.moneytalk.presentation.account.AccountScreen
import com.example.moneytalk.presentation.home.HomeScreen
import com.example.moneytalk.presentation.home.StatisticScreen


@Composable
fun DashboardScreen(onLogout: () -> Unit) {
    val navController = rememberNavController()
    val items = listOf(
        BottomNavItem.Home,
        BottomNavItem.Statistic,
        BottomNavItem.Account
    )

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 0.dp)
                    .navigationBarsPadding()
            ) {
                Surface(
                    color = MaterialTheme.extraColors.bottomNavBackground.copy(alpha = 0.9f),
                    shape = RoundedCornerShape(32.dp),
                    tonalElevation = 8.dp,
                    shadowElevation = 12.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(72.dp)
                            .padding(horizontal = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val navBackStackEntry by navController.currentBackStackEntryAsState()
                        val currentDestination = navBackStackEntry?.destination

                        items.forEach { item ->
                            val isSelected = currentDestination?.hierarchy?.any { it.route == item.route } == true

                            val backgroundColor by animateColorAsState(
                                targetValue = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
                                label = "bg_color"
                            )
                            val contentColor by animateColorAsState(
                                targetValue = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                label = "content_color"
                            )

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(56.dp)
                                    .padding(horizontal = 4.dp)
                                    .clip(RoundedCornerShape(28.dp))
                                    .background(backgroundColor)
                                    .clickable(
                                        interactionSource = remember { MutableInteractionSource() },
                                        indication = ripple(),
                                        onClick = {
                                            navController.navigate(item.route) {
                                                popUpTo(navController.graph.findStartDestination().id) {
                                                    saveState = true
                                                }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        }
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center,
                                    modifier = Modifier.animateContentSize()
                                ) {
                                    Icon(
                                        imageVector = item.icon,
                                        contentDescription = item.label,
                                        tint = contentColor,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = BottomNavItem.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(BottomNavItem.Home.route) {
                HomeScreen()
            }
            composable(BottomNavItem.Statistic.route) { StatisticScreen() }
            composable(BottomNavItem.Account.route) {
                AccountScreen(onLogout = onLogout)
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun DashboardScreenPreview() {
    MoneyTalkTheme(darkTheme = true) {
        DashboardScreen(onLogout = {})
    }
}

@Preview(showBackground = true)
@Composable
fun DashboardScreenLightPreview() {
    MoneyTalkTheme(darkTheme = false) {
        DashboardScreen(onLogout = {})
    }
}
