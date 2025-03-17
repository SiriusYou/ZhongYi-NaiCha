package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.Order
import com.zhongyi.naicha.data.repositories.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OrderConfirmationViewModel @Inject constructor(
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _order = MutableLiveData<Order?>(null)
    val order: LiveData<Order?> = _order
    
    private val _loading = MutableLiveData(false)
    val loading: LiveData<Boolean> = _loading
    
    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error
    
    fun loadOrderDetails(orderId: String) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            
            try {
                val orderDetails = orderRepository.getOrderDetails(orderId)
                _order.value = orderDetails
            } catch (e: Exception) {
                _error.value = e.message ?: "Error loading order details"
            } finally {
                _loading.value = false
            }
        }
    }
} 