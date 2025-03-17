package com.zhongyi.naicha.data.storage

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.zhongyi.naicha.data.models.CartItem
import dagger.hilt.android.qualifiers.ApplicationContext
import java.math.BigDecimal
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CartManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val gson = Gson()
    private val sharedPreferences: SharedPreferences = context.getSharedPreferences(
        "cart_preferences", Context.MODE_PRIVATE
    )
    
    private val cartItemsKey = "cart_items"
    
    /**
     * Get all items in the cart
     */
    fun getCartItems(): List<CartItem> {
        val cartJson = sharedPreferences.getString(cartItemsKey, null) ?: return emptyList()
        val type = object : TypeToken<List<CartItem>>() {}.type
        return gson.fromJson(cartJson, type)
    }
    
    /**
     * Add an item to the cart
     */
    fun addItem(
        recipeId: String,
        name: String,
        image: String?,
        price: BigDecimal,
        quantity: Int = 1,
        options: Map<String, String>? = null,
        notes: String? = null
    ): Boolean {
        val cartItems = getCartItems().toMutableList()
        
        // Check if item already exists with same options
        val existingItemIndex = cartItems.indexOfFirst { item ->
            item.recipeId == recipeId && 
            item.options == options
        }
        
        return if (existingItemIndex != -1) {
            // Update quantity of existing item
            val existingItem = cartItems[existingItemIndex]
            val updatedItem = existingItem.copy(
                quantity = existingItem.quantity + quantity,
                notes = notes ?: existingItem.notes
            )
            cartItems[existingItemIndex] = updatedItem
            saveCartItems(cartItems)
            true
        } else {
            // Add new item
            val newItem = CartItem(
                id = UUID.randomUUID().toString(),
                recipeId = recipeId,
                name = name,
                image = image,
                price = price,
                quantity = quantity,
                options = options,
                notes = notes
            )
            cartItems.add(newItem)
            saveCartItems(cartItems)
            true
        }
    }
    
    /**
     * Update quantity of a cart item
     */
    fun updateQuantity(cartItemId: String, quantity: Int): Boolean {
        if (quantity <= 0) {
            return removeItem(cartItemId)
        }
        
        val cartItems = getCartItems().toMutableList()
        val itemIndex = cartItems.indexOfFirst { it.id == cartItemId }
        
        if (itemIndex == -1) return false
        
        val item = cartItems[itemIndex]
        cartItems[itemIndex] = item.copy(quantity = quantity)
        
        return saveCartItems(cartItems)
    }
    
    /**
     * Update notes of a cart item
     */
    fun updateNotes(cartItemId: String, notes: String?): Boolean {
        val cartItems = getCartItems().toMutableList()
        val itemIndex = cartItems.indexOfFirst { it.id == cartItemId }
        
        if (itemIndex == -1) return false
        
        val item = cartItems[itemIndex]
        cartItems[itemIndex] = item.copy(notes = notes)
        
        return saveCartItems(cartItems)
    }
    
    /**
     * Remove an item from the cart
     */
    fun removeItem(cartItemId: String): Boolean {
        val cartItems = getCartItems().toMutableList()
        val removed = cartItems.removeIf { it.id == cartItemId }
        
        if (!removed) return false
        
        return saveCartItems(cartItems)
    }
    
    /**
     * Clear the cart
     */
    fun clearCart(): Boolean {
        return sharedPreferences.edit().remove(cartItemsKey).commit()
    }
    
    /**
     * Get cart total
     */
    fun getCartTotal(): BigDecimal {
        return getCartItems().fold(BigDecimal.ZERO) { total, item ->
            total.add(item.price.multiply(BigDecimal(item.quantity)))
        }
    }
    
    /**
     * Get cart item count
     */
    fun getCartItemCount(): Int {
        return getCartItems().sumOf { it.quantity }
    }
    
    /**
     * Save cart items to shared preferences
     */
    private fun saveCartItems(cartItems: List<CartItem>): Boolean {
        val cartJson = gson.toJson(cartItems)
        return sharedPreferences.edit().putString(cartItemsKey, cartJson).commit()
    }
} 