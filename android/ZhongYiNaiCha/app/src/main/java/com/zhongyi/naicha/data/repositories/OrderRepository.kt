package com.zhongyi.naicha.data.repositories

import com.zhongyi.naicha.data.api.ApiClient
import com.zhongyi.naicha.data.models.Address
import com.zhongyi.naicha.data.models.CartItem
import com.zhongyi.naicha.data.models.Order
import com.zhongyi.naicha.data.models.Shop
import com.zhongyi.naicha.data.storage.CartManager
import com.zhongyi.naicha.data.storage.TokenManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrderRepository @Inject constructor(
    private val tokenManager: TokenManager,
    private val cartManager: CartManager
) {
    
    private val orderService = ApiClient.orderService
    
    /**
     * Get orders for current user
     */
    suspend fun getOrders(page: Int = 1, limit: Int = 10, status: String? = null): List<Order> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext emptyList()
            
            val response = orderService.getOrders(
                token = "Bearer $token",
                page = page,
                limit = limit,
                status = status
            )
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.orders
            }
            
            return@withContext emptyList()
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext emptyList()
        }
    }
    
    /**
     * Get order details
     */
    suspend fun getOrderDetails(orderId: String): Order? = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext null
            
            val response = orderService.getOrderDetails(
                token = "Bearer $token",
                orderId = orderId
            )
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.order
            }
            
            return@withContext null
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext null
        }
    }
    
    /**
     * Create a new order
     */
    suspend fun createOrder(
        items: List<CartItem>,
        paymentMethod: String,
        shopId: String? = null,
        deliveryAddress: Address? = null,
        pickupTime: Date? = null,
        notes: String? = null
    ): Order? = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext null
            
            // Build order data
            val orderData = mutableMapOf<String, Any>(
                "items" to items.map { 
                    mapOf(
                        "recipeId" to it.recipeId,
                        "quantity" to it.quantity,
                        "options" to (it.options ?: emptyMap()),
                        "notes" to (it.notes ?: "")
                    )
                },
                "paymentMethod" to paymentMethod
            )
            
            shopId?.let { orderData["shopId"] = it }
            
            deliveryAddress?.let { 
                orderData["deliveryAddress"] = mapOf(
                    "id" to it.id,
                    "name" to it.name,
                    "phone" to it.phone,
                    "province" to it.province,
                    "city" to it.city,
                    "district" to it.district,
                    "street" to it.street,
                    "buildingNumber" to (it.buildingNumber ?: ""),
                    "apartment" to (it.apartment ?: ""),
                    "postalCode" to (it.postalCode ?: "")
                )
            }
            
            pickupTime?.let { orderData["pickupTime"] = it.time }
            notes?.let { orderData["notes"] = it }
            
            val response = orderService.createOrder(
                token = "Bearer $token",
                orderData = orderData
            )
            
            if (response.isSuccessful && response.body() != null) {
                val order = response.body()!!.order
                
                // Clear cart on successful order
                if (order != null) {
                    cartManager.clearCart()
                }
                
                return@withContext order
            }
            
            return@withContext null
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext null
        }
    }
    
    /**
     * Cancel an order
     */
    suspend fun cancelOrder(orderId: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext false
            
            val response = orderService.cancelOrder(
                token = "Bearer $token",
                orderId = orderId
            )
            
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }
    
    /**
     * Get nearby shops
     */
    suspend fun getNearbyShops(
        latitude: Double,
        longitude: Double,
        radius: Double = 10.0,
        page: Int = 1,
        limit: Int = 20
    ): List<Shop> = withContext(Dispatchers.IO) {
        try {
            val response = orderService.getShops(
                latitude = latitude,
                longitude = longitude,
                radius = radius,
                page = page,
                limit = limit
            )
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.shops
            }
            
            return@withContext emptyList()
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext emptyList()
        }
    }
    
    /**
     * Get cart items
     */
    fun getCartItems(): List<CartItem> {
        return cartManager.getCartItems()
    }
    
    /**
     * Add item to cart
     */
    fun addItemToCart(
        recipeId: String,
        name: String,
        image: String?,
        price: java.math.BigDecimal,
        quantity: Int = 1,
        options: Map<String, String>? = null,
        notes: String? = null
    ): Boolean {
        return cartManager.addItem(
            recipeId = recipeId,
            name = name,
            image = image,
            price = price,
            quantity = quantity,
            options = options,
            notes = notes
        )
    }
    
    /**
     * Update cart item quantity
     */
    fun updateCartItemQuantity(cartItemId: String, quantity: Int): Boolean {
        return cartManager.updateQuantity(cartItemId, quantity)
    }
    
    /**
     * Remove item from cart
     */
    fun removeItemFromCart(cartItemId: String): Boolean {
        return cartManager.removeItem(cartItemId)
    }
    
    /**
     * Clear cart
     */
    fun clearCart(): Boolean {
        return cartManager.clearCart()
    }
    
    /**
     * Get cart total
     */
    fun getCartTotal(): java.math.BigDecimal {
        return cartManager.getCartTotal()
    }
    
    /**
     * Get cart item count
     */
    fun getCartItemCount(): Int {
        return cartManager.getCartItemCount()
    }
} 