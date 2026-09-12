package com.example.moneytalk.presentation.auth.signup

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonColors
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.moneytalk.R
import com.example.moneytalk.core.ui.components.LocalToastManager
import com.example.moneytalk.core.ui.theme.MoneyTalkTheme

@Composable
fun SignupScreen(
    onSignupSuccess: () -> Unit,
    onBackToLogin: () -> Unit,
    viewModel: SignupViewModel = viewModel()
) {
    val email = viewModel.email.value
    val password = viewModel.password.value
    val confirmPassword = viewModel.confirmPassword.value
    val emailError = viewModel.emailError.value
    val passwordError = viewModel.passwordError.value
    val confirmPasswordError = viewModel.confirmPasswordError.value
    val isPasswordVisible = viewModel.isPasswordVisible.value
    val isConfirmPasswordVisible = viewModel.isConfirmPasswordVisible.value
    val isLoading = viewModel.isLoading.value
    val toastManager = LocalToastManager.current

    Scaffold { innerPadding ->
        // Root container - stays fixed even when keyboard opens
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(color = Color(0xFFD0BCFF))
        ) {
            // Background image - fills entire screen and doesn't shrink
            Image(
                painter = painterResource(R.drawable.signin_background),
                contentDescription = null,
                contentScale = ContentScale.FillHeight,
                modifier = Modifier.fillMaxSize()
            )

            // Content container - handles status bars and keyboard
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .imePadding()
            ) {
                // Centered card
                Surface(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .fillMaxWidth(0.9f)
                        .wrapContentHeight(),
                    shape = RoundedCornerShape(24.dp),
                    color = Color.White.copy(alpha = 0.15f),
                    border = BorderStroke(1.dp, color = Color.White.copy(alpha = 0.3f))
                ) {
                    val scrollState = rememberScrollState()
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(scrollState)
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.Start
                    ) {
                        Text(
                            text = stringResource(R.string.signup_title),
                            style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = stringResource(R.string.signup_description),
                            style = MaterialTheme.typography.bodySmall.copy(color = Color.White),
                        )

                        Spacer(modifier = Modifier.height(32.dp))

                        OutlinedTextField(
                            value = email,
                            onValueChange = viewModel::onEmailChange,
                            label = {
                                Text(
                                    stringResource(R.string.email),
                                    style = MaterialTheme.typography.bodyMedium.copy(color = Color.White)
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            isError = emailError != null,
                            supportingText = {
                                if (emailError != null) {
                                    Text(
                                        text = stringResource(emailError),
                                        style = MaterialTheme.typography.bodySmall.copy(color = Color.Red)
                                    )
                                }
                            },
                            textStyle = MaterialTheme.typography.bodyMedium.copy(color = Color.White),
                            trailingIcon = {
                                Icon(
                                    imageVector = Icons.Outlined.Person,
                                    contentDescription = null,
                                    tint = if (emailError != null) Color.Red else Color.White
                                )
                            },
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Email,
                            ),
                            shape = RoundedCornerShape(24.dp),
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = password,
                            onValueChange = viewModel::onPasswordChange,
                            label = {
                                Text(
                                    stringResource(R.string.password),
                                    style = MaterialTheme.typography.bodyMedium.copy(color = Color.White)
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            isError = passwordError != null,
                            supportingText = {
                                if (passwordError != null) {
                                    Text(
                                        text = stringResource(passwordError),
                                        style = MaterialTheme.typography.bodySmall.copy(color = Color.Red)
                                    )
                                }
                            },
                            visualTransformation = if (!isPasswordVisible) PasswordVisualTransformation() else VisualTransformation.None,
                            singleLine = true,
                            textStyle = MaterialTheme.typography.bodyMedium.copy(color = Color.White),
                            trailingIcon = {
                                IconButton(
                                    onClick = viewModel::onPasswordVisibilityChange,
                                ) {
                                    Icon(
                                        imageVector = if (isPasswordVisible) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff,
                                        contentDescription = null,
                                        tint = if (passwordError != null) Color.Red else Color.White
                                    )
                                }
                            },
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Password,
                            ),
                            shape = RoundedCornerShape(24.dp),
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = confirmPassword,
                            onValueChange = viewModel::onConfirmPasswordChange,
                            label = {
                                Text(
                                    stringResource(R.string.signup_confirm_password),
                                    style = MaterialTheme.typography.bodyMedium.copy(color = Color.White)
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            isError = confirmPasswordError != null,
                            supportingText = {
                                if (confirmPasswordError != null) {
                                    Text(
                                        text = stringResource(confirmPasswordError),
                                        style = MaterialTheme.typography.bodySmall.copy(color = Color.Red)
                                    )
                                }
                            },
                            visualTransformation = if (!isConfirmPasswordVisible) PasswordVisualTransformation() else VisualTransformation.None,
                            singleLine = true,
                            textStyle = MaterialTheme.typography.bodyMedium.copy(color = Color.White),
                            trailingIcon = {
                                IconButton(
                                    onClick = viewModel::onConfirmPasswordVisibilityChange,
                                ) {
                                    Icon(
                                        imageVector = if (isConfirmPasswordVisible) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff,
                                        contentDescription = null,
                                        tint = if (confirmPasswordError != null) Color.Red else Color.White
                                    )
                                }
                            },
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Password,
                            ),
                            shape = RoundedCornerShape(24.dp),
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        Button(
                            onClick = {
                                viewModel.onSignup(
                                    onSuccess = onSignupSuccess,
                                    onError = { error ->
                                        toastManager.error(error)
                                    }
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonColors(
                                containerColor = Color(0xFF1b859f),
                                contentColor = Color.White,
                                disabledContainerColor = Color(0xFF1b859f).copy(alpha = 0.5f),
                                disabledContentColor = Color.White.copy(alpha = 0.5f)
                            ),
                            enabled = !isLoading,
                            shape = RoundedCornerShape(24.dp),
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text(
                                    text = stringResource(R.string.signup_title),
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        color = Color.White
                                    )
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            Text(
                                stringResource(R.string.siginup_have_account),
                                style = MaterialTheme.typography.bodyMedium.copy(Color.White)
                            )
                            Text(
                                stringResource(R.string.signup_title),
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    Color.White,
                                    fontWeight = FontWeight(700),
                                ),
                                modifier = Modifier.clickable {
                                    onBackToLogin()
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun SignupScreenPreview() {
    MoneyTalkTheme {
        SignupScreen(
            onSignupSuccess = {},
            onBackToLogin = {}
        )
    }
}
