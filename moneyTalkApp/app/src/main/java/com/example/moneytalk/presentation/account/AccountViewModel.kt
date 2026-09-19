package com.example.moneytalk.presentation.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.moneytalk.MoneyTalkApp
import com.example.moneytalk.core.network.NetworkResult
import com.example.moneytalk.data.repository.auth.AuthRepository
import com.example.moneytalk.domain.model.user.User
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AccountViewModel : ViewModel() {
    private val authRepository = AuthRepository(MoneyTalkApp.instance.tokenManager)

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()


    fun getUserInfo(onComplete: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            val result = authRepository.getMe()
            when (result) {
                is NetworkResult.Success -> {
                    updateUserInfo(result.data)
                    onComplete(true)
                }
                is NetworkResult.Error -> {
                    onComplete(false)
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    fun updateUserInfo(user: User) {
        _currentUser.value = user
        _isLoggedIn.value = true
    }

    fun clearUserInfo() {
        _currentUser.value = null
        _isLoggedIn.value = false
    }


    fun logout(onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            val result = authRepository.logout()
            when(result){
                is NetworkResult.Success -> {
                    clearUserInfo()
                    onSuccess()
                }
                is NetworkResult.Error -> {
                    onError(result.message)
                }
                is NetworkResult.Loading -> {
                    // Handle loading state if needed
                }
            }
        }
    }
}
