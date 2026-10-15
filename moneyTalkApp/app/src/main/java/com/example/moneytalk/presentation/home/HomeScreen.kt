package com.example.moneytalk.presentation.home

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.moneytalk.R
import com.example.moneytalk.core.ui.theme.ExpenseRed
import com.example.moneytalk.core.ui.theme.IncomeGreen
import com.example.moneytalk.core.ui.theme.MoneyTalkTheme
import com.example.moneytalk.presentation.account.LocalAccountManager
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen() {
    val accountManager = LocalAccountManager.current
    val currentUser by accountManager.currentUser.collectAsState()
    
    val name = currentUser?.name ?: "N/A"
    val greeting = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
        in 0..11 -> "Good morning"
        in 12..17 -> "Good afternoon"
        else -> "Good evening"
    }

    HomeScreenContent(
        userName = name,
        greeting = greeting
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreenContent(
    userName: String,
    greeting: String
) {
    var selectedDate by remember { mutableStateOf(Calendar.getInstance()) }
    var selectedTransaction by remember { mutableStateOf<Transaction?>(null) }
    val sheetState = rememberModalBottomSheetState()
    var showSheet by remember { mutableStateOf(false) }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { /* TODO: Add transaction */ },
                containerColor = MaterialTheme.colorScheme.primary,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Transaction", tint = Color.White)
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Header with User Info and Greeting
            HomeHeaderContent(
                name = userName,
                greeting = greeting,
                modifier = Modifier.padding(16.dp),
                onProfileClick = { /* TODO: Navigate to Profile */ }
            )

            // Full Monthly Calendar View
            MonthlyCalendarView(
                selectedDate = selectedDate,
                onDateSelected = { selectedDate = it }
            )

            Spacer(modifier = Modifier.height(16.dp))

            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                // Overview for the selected day
                BalanceOverviewCard(selectedDate)

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Transactions",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))

                // List of transactions for that day
                TransactionList(onTransactionClick = {
                    selectedTransaction = it
                    showSheet = true
                })
            }
        }

        if (showSheet && selectedTransaction != null) {
            TransactionDetailSheet(
                transaction = selectedTransaction!!,
                sheetState = sheetState,
                onDismiss = { showSheet = false }
            )
        }
    }
}

@Composable
fun HomeHeaderContent(
    name: String,
    greeting: String,
    modifier: Modifier = Modifier,
    onProfileClick: () -> Unit
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text(
                text = "Hello, $name",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = greeting,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        // Profile Icon or Avatar
        Surface(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .clickable { onProfileClick() },
            color = MaterialTheme.colorScheme.primaryContainer
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = "Profile",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
fun MonthlyCalendarView(
    selectedDate: Calendar,
    onDateSelected: (Calendar) -> Unit
) {
    var currentMonth by remember { mutableStateOf(selectedDate.clone() as Calendar) }
    
    val monthYearFormat = SimpleDateFormat("MMMM yyyy", Locale.getDefault())
    
    val daysInMonth = remember(currentMonth) {
        val list = mutableListOf<Calendar?>()
        val cal = currentMonth.clone() as Calendar
        cal.set(Calendar.DAY_OF_MONTH, 1)
        
        // Padding for the start of the week (assuming Sunday as first day)
        val firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - 1
        repeat(firstDayOfWeek) { list.add(null) }
        
        val maxDays = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        repeat(maxDays) {
            list.add(cal.clone() as Calendar)
            cal.add(Calendar.DAY_OF_MONTH, 1)
        }
        list
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(vertical = 16.dp)
    ) {
        // Month Selector Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = monthYearFormat.format(currentMonth.time),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            Row {
                IconButton(onClick = {
                    val newMonth = currentMonth.clone() as Calendar
                    newMonth.add(Calendar.MONTH, -1)
                    currentMonth = newMonth
                }) {
                    Icon(Icons.Default.ChevronLeft, contentDescription = "Prev Month")
                }
                IconButton(onClick = {
                    val newMonth = currentMonth.clone() as Calendar
                    newMonth.add(Calendar.MONTH, 1)
                    currentMonth = newMonth
                }) {
                    Icon(Icons.Default.ChevronRight, contentDescription = "Next Month")
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Weekday Headers
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
            val weekDays = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
            weekDays.forEach { day ->
                Text(
                    text = day,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Days Grid
        val rows = daysInMonth.chunked(7)
        rows.forEach { week ->
            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
                week.forEach { date ->
                    Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                        if (date != null) {
                            val isSelected = isSameDay(date, selectedDate)
                            val isToday = isSameDay(date, Calendar.getInstance())
                            
                            DateCell(
                                date = date,
                                isSelected = isSelected,
                                isToday = isToday,
                                onClick = { onDateSelected(date) }
                            )
                        } else {
                            Spacer(modifier = Modifier.size(40.dp))
                        }
                    }
                }
                // Fill remaining empty spots in the last row if necessary
                if (week.size < 7) {
                    repeat(7 - week.size) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
fun DateCell(date: Calendar, isSelected: Boolean, isToday: Boolean, onClick: () -> Unit) {
    val bgColor by animateColorAsState(
        targetValue = when {
            isSelected -> MaterialTheme.colorScheme.primary
            else -> Color.Transparent
        },
        label = "bg"
    )
    val contentColor by animateColorAsState(
        targetValue = when {
            isSelected -> Color.White
            isToday -> MaterialTheme.colorScheme.primary
            else -> MaterialTheme.colorScheme.onSurface
        },
        label = "color"
    )

    Column(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(bgColor)
            .clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = date.get(Calendar.DAY_OF_MONTH).toString(),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (isSelected || isToday) FontWeight.Bold else FontWeight.Normal,
            color = contentColor
        )
        if (isToday && !isSelected) {
            Box(
                modifier = Modifier
                    .size(4.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary)
            )
        }
    }
}

private fun isSameDay(cal1: Calendar, cal2: Calendar): Boolean {
    return cal1.get(Calendar.YEAR) == cal2.get(Calendar.YEAR) &&
           cal1.get(Calendar.DAY_OF_YEAR) == cal2.get(Calendar.DAY_OF_YEAR)
}

@Composable
fun BalanceOverviewCard(date: Calendar) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(text = "Daily Total", style = MaterialTheme.typography.labelMedium)
                Text(text = "$120.00", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            }
            
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                SummaryMiniItem("In", "+$200", IncomeGreen)
                SummaryMiniItem("Out", "-$80", ExpenseRed)
            }
        }
    }
}

@Composable
fun SummaryMiniItem(label: String, amount: String, color: Color) {
    Column(horizontalAlignment = Alignment.End) {
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = color.copy(alpha = 0.8f))
        Text(text = amount, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = color)
    }
}

@Composable
fun TransactionList(onTransactionClick: (Transaction) -> Unit) {
    val transactions = listOf(
        Transaction(1, "Lunch", "Pho Bo at center", -15.0, false, Icons.Default.Restaurant, hasAttachment = true),
        Transaction(2, "Grab", "Work to home", -5.0, false, Icons.Default.DirectionsCar),
        Transaction(3, "Bonus", "Project reward", 500.0, true, Icons.Default.CardGiftcard),
    )
    
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 16.dp)
    ) {
        items(transactions) { transaction ->
            TransactionItem(transaction, onClick = { onTransactionClick(transaction) })
        }
    }
}

@Composable
fun TransactionItem(transaction: Transaction, onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(transaction.icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(text = transaction.title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                if (transaction.hasAttachment) {
                    Icon(Icons.Default.AttachFile, null, modifier = Modifier.size(12.dp), tint = Color.Gray)
                }
            }
            
            Text(
                text = (if (transaction.isIncome) "+" else "") + "$${transaction.amount}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = if (transaction.isIncome) IncomeGreen else ExpenseRed
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionDetailSheet(
    transaction: Transaction,
    sheetState: SheetState,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        dragHandle = { BottomSheetDefaults.DragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .padding(bottom = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = stringResource(R.string.transaction_details),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Large Amount
            Text(
                text = (if (transaction.isIncome) "+" else "") + "$${transaction.amount}",
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Black,
                color = if (transaction.isIncome) IncomeGreen else ExpenseRed
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Details Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    DetailRow(stringResource(R.string.category), transaction.title, transaction.icon)
                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), thickness = 0.5.dp)
                    DetailRow(stringResource(R.string.note), transaction.description, Icons.Default.Notes)
                }
            }
            
            if (transaction.hasAttachment) {
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = stringResource(R.string.attachment),
                    modifier = Modifier.fillMaxWidth(),
                    style = MaterialTheme.typography.titleSmall,
                    textAlign = TextAlign.Start
                )
                Spacer(modifier = Modifier.height(8.dp))
                // Mock Attachment UI
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.Gray.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Image, null, modifier = Modifier.size(48.dp), tint = Color.Gray)
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Button(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Close")
            }
        }
    }
}

@Composable
fun DetailRow(label: String, value: String, icon: ImageVector) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
        Spacer(modifier = Modifier.width(8.dp))
        Text(text = label, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
        Spacer(modifier = Modifier.weight(1f))
        Text(text = value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
    }
}

data class Transaction(
    val id: Int,
    val title: String,
    val description: String,
    val amount: Double,
    val isIncome: Boolean,
    val icon: ImageVector,
    val hasAttachment: Boolean = false
)



@Composable
fun StatisticScreen(){
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center){
        Text(text = "Statistic Screen")
    }
}

@Preview(showBackground = true)
@Composable
fun HomeScreenPreview() {
    MoneyTalkTheme {
        HomeScreenContent(
            userName = "nnhuy",
            greeting = "Good morning"
        )
    }
}
