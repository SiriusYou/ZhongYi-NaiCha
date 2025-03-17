package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.CartItem
import com.zhongyi.naicha.data.repositories.OrderRepository
import com.zhongyi.naicha.data.repositories.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.math.BigDecimal
import javax.inject.Inject

@HiltViewModel
class CartViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _cartItems = MutableLiveData<List<CartItem>>()
    val cartItems: LiveData<List<CartItem>> = _cartItems
    
    private val _cartTotal = MutableLiveData<BigDecimal>()
    val cartTotal: LiveData<BigDecimal> = _cartTotal
    
    private val _cartItemCount = MutableLiveData<Int>()
    val cartItemCount: LiveData<Int> = _cartItemCount
    
    private val _isLoggedIn = MutableLiveData<Boolean>()
    val isLoggedIn: LiveData<Boolean> = _isLoggedIn
    
    init {
        loadCartItems()
        checkLoginStatus()
    }
    
    private fun checkLoginStatus() {
        viewModelScope.launch {
            val token = userRepository.getToken()
            _isLoggedIn.value = token != null
        }
    }
    
    fun loadCartItems() {
        val items = orderRepository.getCartItems()
        _cartItems.value = items
        _cartTotal.value = orderRepository.getCartTotal()
        _cartItemCount.value = orderRepository.getCartItemCount()
    }
    
    fun updateItemQuantity(cartItemId: String, quantity: Int) {
        if (orderRepository.updateCartItemQuantity(cartItemId, quantity)) {
            loadCartItems()
        }
    }
    
    fun removeItem(cartItemId: String) {
        if (orderRepository.removeItemFromCart(cartItemId)) {
            loadCartItems()
        }
    }
    
    fun clearCart() {
        if (orderRepository.clearCart()) {
            loadCartItems()
        }
    }
    
    fun addItemToCart(
        recipeId: String,
        name: String,
        image: String?,
        price: BigDecimal,
        quantity: Int = 1,
        options: Map<String, String>? = null,
        notes: String? = null
    ): Boolean {
        val success = orderRepository.addItemToCart(
            recipeId = recipeId,
            name = name,
            image = image,
            price = price,
            quantity = quantity,
            options = options,
            notes = notes
        )
        
        if (success) {
            loadCartItems()
        }
        
        return success
    }
    
    fun hasItems(): Boolean {
        return (_cartItems.value?.isNotEmpty() == true)
    }
} 