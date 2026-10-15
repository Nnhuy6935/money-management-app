package com.example.moneytalk.core.network

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class PaginationState<T> {
    private val _items = MutableStateFlow<List<T>>(emptyList())
    val items = _items.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error = _error.asStateFlow()

    private var currentPage = 1
    private var canLoadMore = true

    fun onResponse(result: NetworkResult<PaginatedResponse<T>>, isRefresh: Boolean = false) {
        _isLoading.value = false
        
        when (result) {
            is NetworkResult.Success -> {
                val newData = result.data.data
                val meta = result.data.meta
                
                if (isRefresh) {
                    _items.value = newData
                    currentPage = 1
                } else {
                    _items.update { it + newData }
                }
                
                currentPage = meta.page
                canLoadMore = currentPage < meta.totalPages
            }
            is NetworkResult.Error -> {
                _error.value = result.message
            }
            is NetworkResult.Loading -> {
                _isLoading.value = true
            }
        }
    }

    fun getNextPage(): Int? = if (canLoadMore && !_isLoading.value) currentPage + 1 else null

    fun reset() {
        _items.value = emptyList()
        currentPage = 1
        canLoadMore = true
        _error.value = null
    }
}
