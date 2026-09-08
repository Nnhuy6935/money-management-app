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
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.moneytalk.R
import com.example.moneytalk.core.ui.theme.MoneyTalkTheme
import com.example.moneytalk.presentation.auth.signup.SignupViewModel

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


    Scaffold { innerPadding ->
        //background
        Box(
            modifier = Modifier
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
                                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error)
                                )
                            }
                        },
                        visualTransformation = if(!isConfirmPasswordVisible) PasswordVisualTransformation() else VisualTransformation.None,
                        singleLine = true,
                        textStyle = MaterialTheme.typography.bodyMedium.copy(color = Color.White),
                        trailingIcon = {
                            IconButton(
                                onClick =  viewModel::onConfirmPasswordVisibilityChange,
                            ) {
                                Icon(
                                    imageVector = if (isConfirmPasswordVisible) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff,
                                    contentDescription = null,
                                    tint = if (confirmPasswordError != null) MaterialTheme.colorScheme.error else Color.White
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
                        onClick = { viewModel.onSignup(onSignupSuccess)},
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
                            text = stringResource(R.string.signup_title),
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = Color.White)
                        )
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
                            modifier = Modifier.clickable{
                                onBackToLogin();
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
fun SignupScreenPreview() {
    MoneyTalkTheme {
        SignupScreen(
            onSignupSuccess = {},
            onBackToLogin = {}
        )
    }
}
