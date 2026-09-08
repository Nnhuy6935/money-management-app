package com.example.moneytalk.presentation.auth.signup

import android.util.Patterns
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.compose.runtime.State
import com.example.moneytalk.R

class SignupViewModel : ViewModel() {
    private val _email = mutableStateOf("")
    val email : State<String> = _email

    private val _password = mutableStateOf("")
    val password : State<String> = _password

    private val _confirmPassword = mutableStateOf("")
    val confirmPassword : State<String> = _confirmPassword

    private val _emailError = mutableStateOf<Int?>(null)
    val emailError: State<Int?> = _emailError

    private val _passwordError = mutableStateOf<Int?>(null)
    val passwordError: State<Int?> = _passwordError

    private val _confirmPasswordError = mutableStateOf<Int?>(null)
    val confirmPasswordError: State<Int?> = _confirmPasswordError

    private val _isPasswordVisible = mutableStateOf(false)
    val isPasswordVisible : State<Boolean> = _isPasswordVisible

    private val _isConfirmPasswordVisible = mutableStateOf(false)
    val isConfirmPasswordVisible : State<Boolean> = _isConfirmPasswordVisible


    fun onEmailChange(email: String){
        _email.value = email
        _emailError.value = null
    }

    fun onPasswordChange(password: String){
        _password.value = password
        _passwordError.value = null
    }

    fun onConfirmPasswordChange(confirmPassword: String){
        _confirmPassword.value = confirmPassword
        _confirmPasswordError.value = null
    }

    fun onPasswordVisibilityChange(){
        _isPasswordVisible.value = !_isPasswordVisible.value
    }

    fun onConfirmPasswordVisibilityChange(){
        _isConfirmPasswordVisible.value = !_isConfirmPasswordVisible.value
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

        if (_confirmPassword.value != _password.value) {
            _confirmPasswordError.value = R.string.error_confirm_password_mismatch
            isValid = false
        }

        return isValid
    }

    fun onSignup(onSuccess: () -> Unit){
        if (validate()) {
            onSuccess()
        }
    }
}
