package com.example.moneytalk.core.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.moneytalk.core.ui.theme.MoneyTalkTheme
import kotlinx.coroutines.delay

enum class ToastType(val color: Color, val icon: ImageVector) {
    SUCCESS(Color(0xFF4CAF50), Icons.Default.CheckCircle),
    FAILED(Color(0xFFF44336), Icons.Default.Error),
    INFO(Color(0xFFFFC107), Icons.Default.Info)
}

data class ToastData(
    val message: String,
    val type: ToastType
)

@Composable
fun CustomToast(
    toastData: ToastData?,
    onDismiss: () -> Unit,
    duration: Long = 3000L
) {
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(toastData) {
        if (toastData != null) {
            visible = true
            delay(duration)
            visible = false
            delay(300) // wait for animation
            onDismiss()
        }
    }

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.TopCenter
    ) {
        AnimatedVisibility(
            visible = visible,
            enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut()
        ) {
            toastData?.let { data ->
                Box(
                    modifier = Modifier
                        .padding(top = 50.dp)
                        .padding(horizontal = 24.dp)
                        .background(
                            color = data.type.color,
                            shape = RoundedCornerShape(12.dp)
                        )
                        .padding(vertical = 12.dp, horizontal = 16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = data.type.icon,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = data.message,
                            color = Color.White,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
    }
}

@Preview
@Composable
private fun SuccessToastPreview() {
    MoneyTalkTheme {
        CustomToast(
            toastData = ToastData("Đăng nhập thành công!", ToastType.SUCCESS),
            onDismiss = {}
        )
    }
}

@Preview
@Composable
private fun FailedToastPreview() {
    MoneyTalkTheme {
        CustomToast(
            toastData = ToastData("Đăng nhập thất bại!", ToastType.FAILED),
            onDismiss = {}
        )
    }
}

@Preview
@Composable
private fun InfoToastPreview() {
    MoneyTalkTheme {
        CustomToast(
            toastData = ToastData("Phiên đăng nhập sắp hết hạn.", ToastType.INFO),
            onDismiss = {}
        )
    }
}
