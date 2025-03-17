package com.zhongyi.naicha.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.CartItem
import com.zhongyi.naicha.databinding.ItemCartBinding

class CartItemAdapter(
    private val onQuantityChanged: (CartItem, Int) -> Unit,
    private val onRemoveItem: (CartItem) -> Unit
) : ListAdapter<CartItem, CartItemAdapter.CartItemViewHolder>(CartItemDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CartItemViewHolder {
        val binding = ItemCartBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return CartItemViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CartItemViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class CartItemViewHolder(
        private val binding: ItemCartBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(cartItem: CartItem) {
            binding.textViewItemName.text = cartItem.name
            binding.textViewItemPrice.text = binding.root.context.getString(
                R.string.price_format, 
                cartItem.price
            )
            binding.textViewQuantity.text = cartItem.quantity.toString()

            // Load image if available
            if (!cartItem.image.isNullOrEmpty()) {
                Glide.with(binding.imageViewItem)
                    .load(cartItem.image)
                    .placeholder(R.drawable.placeholder_recipe)
                    .error(R.drawable.placeholder_recipe)
                    .into(binding.imageViewItem)
            } else {
                binding.imageViewItem.setImageResource(R.drawable.placeholder_recipe)
            }

            // Display options if available
            if (!cartItem.options.isNullOrEmpty()) {
                val optionsText = cartItem.options.entries.joinToString(", ") { 
                    "${it.key}: ${it.value}" 
                }
                binding.textViewItemOptions.text = optionsText
                binding.textViewItemOptions.visibility = ViewGroup.VISIBLE
            } else {
                binding.textViewItemOptions.visibility = ViewGroup.GONE
            }

            // Display notes if available
            if (!cartItem.notes.isNullOrEmpty()) {
                binding.textViewItemNotes.text = cartItem.notes
                binding.textViewItemNotes.visibility = ViewGroup.VISIBLE
            } else {
                binding.textViewItemNotes.visibility = ViewGroup.GONE
            }

            // Setup increment button
            binding.buttonIncrement.setOnClickListener {
                val newQuantity = cartItem.quantity + 1
                if (newQuantity <= 99) {
                    onQuantityChanged(cartItem, newQuantity)
                }
            }

            // Setup decrement button
            binding.buttonDecrement.setOnClickListener {
                val newQuantity = cartItem.quantity - 1
                if (newQuantity > 0) {
                    onQuantityChanged(cartItem, newQuantity)
                } else {
                    onRemoveItem(cartItem)
                }
            }

            // Setup remove button
            binding.buttonRemove.setOnClickListener {
                onRemoveItem(cartItem)
            }
        }
    }

    private class CartItemDiffCallback : DiffUtil.ItemCallback<CartItem>() {
        override fun areItemsTheSame(oldItem: CartItem, newItem: CartItem): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: CartItem, newItem: CartItem): Boolean {
            return oldItem == newItem
        }
    }
} 