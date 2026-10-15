package com.example.moneytalk.presentation.home

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.moneytalk.MoneyTalkApp
import com.example.moneytalk.core.network.NetworkResult
import com.example.moneytalk.core.network.PaginatedResponse
import com.example.moneytalk.data.repository.transaction.TransactionRepository
import com.example.moneytalk.domain.model.transaction.Transaction
import com.example.moneytalk.domain.model.transaction.TransactionListRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Date

class HomeViewModel : ViewModel() {
    private val transactionRepository = TransactionRepository(MoneyTalkApp.instance.tokenManager)


    private val _transactions = MutableStateFlow<PaginatedResponse<Transaction>>(PaginatedResponse.empty<Transaction>())
    val transactions = _transactions.asStateFlow()

    final val _selectedDate = MutableStateFlow<Date>(Date())
    val selectedDate = _selectedDate.asStateFlow()

    final val _isLoading = mutableStateOf(false)
    val isLoading  = _isLoading

    fun loadTransaction(){

    }

    fun loadMore(){
        viewModelScope.launch {
            _isLoading.value = true
            val result = transactionRepository.getMyTransaction(TransactionListRequest(
                date = _selectedDate,
            ))
            _isLoading.value = false

            when (result) {
                is NetworkResult.Success -> _transactions.value = result.data
                is NetworkResult.Error -> onError(result.message)
                is NetworkResult.Loading -> { /* Handled by _isLoading */ }
            }
        }
    }







}