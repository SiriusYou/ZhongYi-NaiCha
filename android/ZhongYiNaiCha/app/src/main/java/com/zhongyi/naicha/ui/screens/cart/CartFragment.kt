package com.zhongyi.naicha.ui.screens.cart

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.zhongyi.naicha.R
import com.zhongyi.naicha.databinding.FragmentCartBinding
import com.zhongyi.naicha.ui.adapters.CartItemAdapter
import com.zhongyi.naicha.ui.viewmodels.CartViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class CartFragment : Fragment() {

    private var _binding: FragmentCartBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: CartViewModel by viewModels()
    private lateinit var cartAdapter: CartItemAdapter
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCartBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupRecyclerView()
        setupClickListeners()
        observeViewModel()
    }
    
    private fun setupRecyclerView() {
        cartAdapter = CartItemAdapter(
            onQuantityChanged = { cartItem, newQuantity ->
                viewModel.updateItemQuantity(cartItem.id, newQuantity)
            },
            onRemoveItem = { cartItem ->
                viewModel.removeItem(cartItem.id)
            }
        )
        
        binding.recyclerViewCart.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = cartAdapter
        }
    }
    
    private fun setupClickListeners() {
        binding.btnClearCart.setOnClickListener {
            viewModel.clearCart()
        }
        
        binding.btnCheckout.setOnClickListener {
            if (viewModel.hasItems()) {
                if (viewModel.isLoggedIn.value == true) {
                    findNavController().navigate(R.id.action_cartFragment_to_checkoutFragment)
                } else {
                    findNavController().navigate(R.id.action_cartFragment_to_loginFragment)
                }
            }
        }
    }
    
    private fun observeViewModel() {
        viewModel.cartItems.observe(viewLifecycleOwner) { items ->
            cartAdapter.submitList(items)
            updateEmptyState(items.isEmpty())
        }
        
        viewModel.cartTotal.observe(viewLifecycleOwner) { total ->
            binding.textViewTotal.text = getString(R.string.price_format, total)
        }
        
        viewModel.isLoggedIn.observe(viewLifecycleOwner) { isLoggedIn ->
            binding.btnCheckout.text = if (isLoggedIn) {
                getString(R.string.proceed_to_checkout)
            } else {
                getString(R.string.login_to_checkout)
            }
        }
    }
    
    private fun updateEmptyState(isEmpty: Boolean) {
        if (isEmpty) {
            binding.groupEmptyCart.visibility = View.VISIBLE
            binding.groupCartContent.visibility = View.GONE
        } else {
            binding.groupEmptyCart.visibility = View.GONE
            binding.groupCartContent.visibility = View.VISIBLE
        }
    }
    
    override fun onResume() {
        super.onResume()
        viewModel.loadCartItems()
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 