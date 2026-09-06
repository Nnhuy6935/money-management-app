package com.example.moneytalk.presentation.auth.login

import android.provider.CalendarContract
import android.text.Layout
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.scrollable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonColors
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldColors
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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
import com.example.moneytalk.core.ui.theme.MoneyTalkTheme

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onSignUpClick: () -> Unit,
    viewModel: LoginViewModel = viewModel()
) {
    val email = viewModel.email.value
    val password = viewModel.password.value
    val emailError = viewModel.emailError.value
    val passwordError = viewModel.passwordError.value
    val isPasswordVisible = viewModel.isPasswordVisible.value

    Scaffold { innerPadding ->
        //background
        Box(
            modifier = Modifier
                .background(color = Color(0xFFD0BCFF))
                .fillMaxSize()

        ){
            //background image
            Image(painter = painterResource(R.drawable.signin_background),
                contentDescription = null,
                contentScale = ContentScale.FillHeight,
                modifier = Modifier.fillMaxSize())
            //signin card (overlay dim and blur)
            Surface(
                modifier = Modifier
                    .align(Alignment.Center)
                    .fillMaxWidth(0.8f)
                    .wrapContentHeight(),
                shape = RoundedCornerShape(24.dp),
                color = Color.White.copy(alpha = 0.15f),
                tonalElevation = 0.dp,
                border = BorderStroke(1.dp, color = Color.White.copy())

            ){

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .wrapContentHeight()
                        .padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.Start
                ) {
                    Text(
                        text = stringResource(R.string.login),
                        style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = stringResource(R.string.welcome_back_message),
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
                                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error)
                                )
                            }
                        },
                        textStyle = MaterialTheme.typography.bodyMedium.copy(color = Color.White),
                        trailingIcon = {
                            Icon(
                                imageVector = Icons.Outlined.Person,
                                contentDescription = null,
                                tint = if (emailError != null) MaterialTheme.colorScheme.error else Color.White
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
                                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error)
                                )
                            }
                        },
                        visualTransformation = if(!isPasswordVisible) PasswordVisualTransformation() else VisualTransformation.None,
                        singleLine = true,
                        textStyle = MaterialTheme.typography.bodyMedium.copy(color = Color.White),
                        trailingIcon = {
                            IconButton(
                                onClick =  viewModel::onPasswordVisibilityChange,
                            ) {
                                Icon(
                                    imageVector = if (isPasswordVisible) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff,
                                    contentDescription = null,
                                    tint = if (passwordError != null) MaterialTheme.colorScheme.error else Color.White
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
                        onClick = { viewModel.onLoginClick(onLoginSuccess) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonColors(
                            containerColor = Color(0xFF1b859f),
                            contentColor = Color.White,
                            disabledContainerColor =  Color(0xFF1b859f).copy(alpha = 0.5f),
                            disabledContentColor = Color.White.copy(alpha = 0.5f)
                        ),
                        enabled = email.isNotBlank() && password.isNotBlank(),
                        shape = RoundedCornerShape(24.dp),
                    ) {
                        Text(
                            text = stringResource(R.string.login),
                            style = MaterialTheme.typography.bodyMedium.copy(color = Color.White)
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        Text(
                            stringResource(R.string.dont_have_account),
                            style = MaterialTheme.typography.bodyMedium.copy(Color.White)
                        )
                        Text(
                            stringResource(R.string.signup),
                            style = MaterialTheme.typography.bodyMedium.copy(
                                Color.White,
                                fontWeight = FontWeight(700),

                                ),
                            modifier = Modifier.clickable{
                                onSignUpClick();
                            }
                        )
                    }
                }

            }
        }


    }
}

@Preview(showBackground = true)
@Composable
fun LoginScreenPreview() {
    MoneyTalkTheme {
        LoginScreen(onLoginSuccess = {}, onSignUpClick = {})
    }
}
