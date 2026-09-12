package com.example.moneytalk.presentation.auth.login

import android.util.Patterns
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.moneytalk.R
import com.example.moneytalk.core.network.NetworkResult
import com.example.moneytalk.data.repository.auth.AuthRepository
import kotlinx.coroutines.launch

class LoginViewModel : ViewModel() {

    private val authRepository = AuthRepository()

    private val _email = mutableStateOf("")
    val email: State<String> = _email

    private val _password = mutableStateOf("")
    val password: State<String> = _password

    private val _emailError = mutableStateOf<Int?>(null)
    val emailError: State<Int?> = _emailError

    private val _passwordError = mutableStateOf<Int?>(null)
    val passwordError: State<Int?> = _passwordError

    private val _isPasswordVisible = mutableStateOf(false)
    val isPasswordVisible: State<Boolean> = _isPasswordVisible

    private val _isLoading = mutableStateOf(false)
    val isLoading: State<Boolean> = _isLoading

    fun onEmailChange(newValue: String) {
        _email.value = newValue
        _emailError.value = null
    }

    fun onPasswordChange(newValue: String) {
        _password.value = newValue
        _passwordError.value = null
    }

    fun onPasswordVisibilityChange() {
        _isPasswordVisible.value = !_isPasswordVisible.value
    }

    private fun validate(): Boolean {
        var isValid = true

        if (_email.value.isBlank()) {
            _emailError.value = R.string.error_email_empty
            isValid = false
        } else if (!Patterns.EMAIL_ADDRESS.matcher(_email.value).matches()) {
            _emailError.value = R.string.error_email_invalid
            isValid = false
        }

        if (_password.value.isBlank()) {
            _passwordError.value = R.string.error_password_empty
            isValid = false
        } else if (_password.value.length < 6) {
            _passwordError.value = R.string.error_password_too_short
            isValid = false
        }

        return isValid
    }

    fun onLoginClick(
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        if (validate()) {
            viewModelScope.launch {
                _isLoading.value = true
                val result = authRepository.login(_email.value, _password.value)
                _isLoading.value = false
                
                when (result) {
                    is NetworkResult.Success -> onSuccess()
                    is NetworkResult.Error -> onError(result.message)
                    is NetworkResult.Loading -> { /* Handled by _isLoading */ }
                }
            }
        }
    }
}
