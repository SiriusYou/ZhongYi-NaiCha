package com.zhongyi.naicha.ui.screens.cart

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.zhongyi.naicha.R
import com.zhongyi.naicha.databinding.FragmentOrderConfirmationBinding
import com.zhongyi.naicha.ui.viewmodels.OrderConfirmationViewModel
import dagger.hilt.android.AndroidEntryPoint
import java.text.SimpleDateFormat
import java.util.Locale

@AndroidEntryPoint
class OrderConfirmationFragment : Fragment() {

    private var _binding: FragmentOrderConfirmationBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: OrderConfirmationViewModel by viewModels()
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentOrderConfirmationBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        arguments?.getString("orderId")?.let { orderId ->
            viewModel.loadOrderDetails(orderId)
        }
        
        setupClickListeners()
        observeViewModel()
    }
    
    private fun setupClickListeners() {
        binding.btnViewOrders.setOnClickListener {
            findNavController().navigate(R.id.action_orderConfirmationFragment_to_orderHistoryFragment)
        }
        
        binding.btnBackToHome.setOnClickListener {
            findNavController().navigate(R.id.action_orderConfirmationFragment_to_homeFragment)
        }
    }
    
    private fun observeViewModel() {
        viewModel.order.observe(viewLifecycleOwner) { order ->
            if (order != null) {
                binding.textViewOrderNumber.text = order.id
                binding.textViewOrderStatus.text = order.status
                
                // Format date
                val dateFormat = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault())
                binding.textViewOrderDate.text = dateFormat.format(order.createdAt)
                
                // Format total
                binding.textViewOrderTotal.text = getString(R.string.price_format, order.total)
                
                // Show payment method
                binding.textViewPaymentMethod.text = order.paymentMethod
                
                // Show delivery method
                val deliveryMethod = if (order.deliveryAddress != null) {
                    getString(R.string.delivery)
                } else {
                    getString(R.string.pickup)
                }
                binding.textViewDeliveryMethod.text = deliveryMethod
                
                // Show address or shop
                if (order.deliveryAddress != null) {
                    binding.textViewAddressOrShop.text = order.deliveryAddress.formattedAddress()
                    binding.labelAddressOrShop.text = getString(R.string.delivery_address)
                } else if (order.shop != null) {
                    binding.textViewAddressOrShop.text = order.shop.name
                    binding.labelAddressOrShop.text = getString(R.string.pickup_location)
                }
                
                // Show pickup time if available
                if (order.pickupTime != null) {
                    binding.textViewPickupTime.text = dateFormat.format(order.pickupTime)
                    binding.groupPickupTime.visibility = View.VISIBLE
                } else {
                    binding.groupPickupTime.visibility = View.GONE
                }
                
                // Show order items
                var itemsText = ""
                for (item in order.items) {
                    itemsText += "• ${item.quantity}x ${item.name}\n"
                    if (!item.options.isNullOrEmpty()) {
                        val optionsText = item.options.entries.joinToString(", ") { 
                            "${it.key}: ${it.value}" 
                        }
                        itemsText += "  ($optionsText)\n"
                    }
                    if (!item.notes.isNullOrEmpty()) {
                        itemsText += "  Note: ${item.notes}\n"
                    }
                }
                binding.textViewOrderItems.text = itemsText
                
                // Show notes if available
                if (!order.notes.isNullOrEmpty()) {
                    binding.textViewOrderNotes.text = order.notes
                    binding.groupOrderNotes.visibility = View.VISIBLE
                } else {
                    binding.groupOrderNotes.visibility = View.GONE
                }
            }
        }
        
        viewModel.loading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.scrollViewContent.visibility = if (isLoading) View.GONE else View.VISIBLE
        }
        
        viewModel.error.observe(viewLifecycleOwner) { error ->
            if (!error.isNullOrEmpty()) {
                binding.textViewError.text = error
                binding.textViewError.visibility = View.VISIBLE
                binding.scrollViewContent.visibility = View.GONE
            } else {
                binding.textViewError.visibility = View.GONE
            }
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 