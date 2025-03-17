package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.Address
import com.zhongyi.naicha.data.models.CartItem
import com.zhongyi.naicha.data.models.Order
import com.zhongyi.naicha.data.models.Shop
import com.zhongyi.naicha.data.repositories.OrderRepository
import com.zhongyi.naicha.data.repositories.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.math.BigDecimal
import java.util.Date
import javax.inject.Inject

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _cartItems = MutableLiveData<List<CartItem>>()
    val cartItems: LiveData<List<CartItem>> = _cartItems
    
    private val _cartTotal = MutableLiveData<BigDecimal>()
    val cartTotal: LiveData<BigDecimal> = _cartTotal
    
    private val _loading = MutableLiveData(false)
    val loading: LiveData<Boolean> = _loading
    
    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error
    
    private val _orderComplete = MutableLiveData<Order?>(null)
    val orderComplete: LiveData<Order?> = _orderComplete
    
    private val _nearbyShops = MutableLiveData<List<Shop>>()
    val nearbyShops: LiveData<List<Shop>> = _nearbyShops
    
    private val _userAddresses = MutableLiveData<List<Address>>()
    val userAddresses: LiveData<List<Address>> = _userAddresses
    
    private val _selectedShop = MutableLiveData<Shop?>(null)
    val selectedShop: LiveData<Shop?> = _selectedShop
    
    private val _selectedAddress = MutableLiveData<Address?>(null)
    val selectedAddress: LiveData<Address?> = _selectedAddress
    
    private val _selectedPaymentMethod = MutableLiveData<String>("CASH")
    val selectedPaymentMethod: LiveData<String> = _selectedPaymentMethod
    
    private val _selectedPickupTime = MutableLiveData<Date?>(null)
    val selectedPickupTime: LiveData<Date?> = _selectedPickupTime
    
    private val _orderNotes = MutableLiveData<String>("")
    val orderNotes: LiveData<String> = _orderNotes
    
    private val _deliveryType = MutableLiveData<DeliveryType>(DeliveryType.PICKUP)
    val deliveryType: LiveData<DeliveryType> = _deliveryType
    
    init {
        loadCartItems()
        loadUserAddresses()
    }
    
    fun loadCartItems() {
        _cartItems.value = orderRepository.getCartItems()
        _cartTotal.value = orderRepository.getCartTotal()
    }
    
    fun setDeliveryType(type: DeliveryType) {
        _deliveryType.value = type
    }
    
    fun loadNearbyShops(latitude: Double, longitude: Double, radius: Double = 5.0) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            
            try {
                val shops = orderRepository.getNearbyShops(latitude, longitude, radius, 1, 20)
                _nearbyShops.value = shops
                
                if (shops.isEmpty()) {
                    _error.value = "No shops found in your area"
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Error loading nearby shops"
            } finally {
                _loading.value = false
            }
        }
    }
    
    private fun loadUserAddresses() {
        viewModelScope.launch {
            try {
                val addresses = userRepository.getUserAddresses()
                _userAddresses.value = addresses
            } catch (e: Exception) {
                _error.value = e.message ?: "Error loading addresses"
            }
        }
    }
    
    fun selectShop(shop: Shop) {
        _selectedShop.value = shop
    }
    
    fun selectAddress(address: Address) {
        _selectedAddress.value = address
    }
    
    fun selectPaymentMethod(method: String) {
        _selectedPaymentMethod.value = method
    }
    
    fun selectPickupTime(time: Date) {
        _selectedPickupTime.value = time
    }
    
    fun setOrderNotes(notes: String) {
        _orderNotes.value = notes
    }
    
    fun placeOrder() {
        val items = _cartItems.value ?: return
        if (items.isEmpty()) {
            _error.value = "Cart is empty"
            return
        }
        
        val paymentMethod = _selectedPaymentMethod.value ?: "CASH"
        val shopId = _selectedShop.value?.id
        val deliveryAddress = if (_deliveryType.value == DeliveryType.DELIVERY) _selectedAddress.value else null
        val pickupTime = _selectedPickupTime.value
        val notes = _orderNotes.value
        
        if (_deliveryType.value == DeliveryType.PICKUP && shopId == null) {
            _error.value = "Please select a shop for pickup"
            return
        }
        
        if (_deliveryType.value == DeliveryType.DELIVERY && deliveryAddress == null) {
            _error.value = "Please select a delivery address"
            return
        }
        
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            
            try {
                val order = orderRepository.createOrder(
                    items = items,
                    paymentMethod = paymentMethod,
                    shopId = shopId,
                    deliveryAddress = deliveryAddress,
                    pickupTime = pickupTime,
                    notes = notes
                )
                _orderComplete.value = order
            } catch (e: Exception) {
                _error.value = e.message ?: "Error placing order"
            } finally {
                _loading.value = false
            }
        }
    }
    
    enum class DeliveryType {
        PICKUP, DELIVERY
    }
} 