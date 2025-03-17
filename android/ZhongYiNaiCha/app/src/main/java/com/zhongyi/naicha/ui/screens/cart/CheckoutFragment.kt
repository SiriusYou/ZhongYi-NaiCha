package com.zhongyi.naicha.ui.screens.cart

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.datepicker.MaterialTimePicker
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.Address
import com.zhongyi.naicha.data.models.Shop
import com.zhongyi.naicha.databinding.FragmentCheckoutBinding
import com.zhongyi.naicha.ui.adapters.AddressAdapter
import com.zhongyi.naicha.ui.adapters.ShopAdapter
import com.zhongyi.naicha.ui.viewmodels.CheckoutViewModel
import dagger.hilt.android.AndroidEntryPoint
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@AndroidEntryPoint
class CheckoutFragment : Fragment() {

    private var _binding: FragmentCheckoutBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: CheckoutViewModel by viewModels()
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var selectedPaymentMethod = "CASH"
    
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            getLastLocation()
        } else {
            Toast.makeText(
                requireContext(),
                R.string.location_permission_denied,
                Toast.LENGTH_SHORT
            ).show()
        }
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCheckoutBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(requireActivity())
        
        setupViews()
        setupClickListeners()
        observeViewModel()
        
        // Default to pickup
        viewModel.setDeliveryType(CheckoutViewModel.DeliveryType.PICKUP)
    }
    
    private fun setupViews() {
        binding.radioGroupDeliveryType.setOnCheckedChangeListener { _, checkedId ->
            when (checkedId) {
                R.id.radioButtonPickup -> {
                    viewModel.setDeliveryType(CheckoutViewModel.DeliveryType.PICKUP)
                    binding.groupPickup.visibility = View.VISIBLE
                    binding.groupDelivery.visibility = View.GONE
                }
                R.id.radioButtonDelivery -> {
                    viewModel.setDeliveryType(CheckoutViewModel.DeliveryType.DELIVERY)
                    binding.groupPickup.visibility = View.GONE
                    binding.groupDelivery.visibility = View.VISIBLE
                }
            }
        }
        
        binding.radioGroupPayment.setOnCheckedChangeListener { _, checkedId ->
            selectedPaymentMethod = when (checkedId) {
                R.id.radioButtonCash -> "CASH"
                R.id.radioButtonCard -> "CARD"
                R.id.radioButtonMobile -> "MOBILE"
                else -> "CASH"
            }
            viewModel.selectPaymentMethod(selectedPaymentMethod)
        }
    }
    
    private fun setupClickListeners() {
        binding.btnSelectShop.setOnClickListener {
            checkLocationPermissionAndFindShops()
        }
        
        binding.btnSelectAddress.setOnClickListener {
            showAddressSelectionDialog()
        }
        
        binding.btnSelectPickupTime.setOnClickListener {
            showDateTimePicker()
        }
        
        binding.btnPlaceOrder.setOnClickListener {
            val notes = binding.editTextOrderNotes.text.toString().trim()
            viewModel.setOrderNotes(notes)
            viewModel.placeOrder()
        }
    }
    
    private fun observeViewModel() {
        viewModel.cartItems.observe(viewLifecycleOwner) { items ->
            if (items.isEmpty()) {
                findNavController().navigateUp()
                return@observe
            }
            
            // Update order summary
            var itemSummary = ""
            for (item in items) {
                itemSummary += "• ${item.quantity}x ${item.name}\n"
            }
            binding.textViewOrderSummary.text = itemSummary
        }
        
        viewModel.cartTotal.observe(viewLifecycleOwner) { total ->
            binding.textViewTotalAmount.text = getString(R.string.price_format, total)
        }
        
        viewModel.selectedShop.observe(viewLifecycleOwner) { shop ->
            if (shop != null) {
                binding.textViewSelectedShop.text = shop.name
                binding.textViewSelectedShop.visibility = View.VISIBLE
                binding.textViewShopAddress.text = shop.address
                binding.textViewShopAddress.visibility = View.VISIBLE
            } else {
                binding.textViewSelectedShop.visibility = View.GONE
                binding.textViewShopAddress.visibility = View.GONE
            }
        }
        
        viewModel.selectedAddress.observe(viewLifecycleOwner) { address ->
            if (address != null) {
                binding.textViewSelectedAddress.text = address.formattedAddress()
                binding.textViewSelectedAddress.visibility = View.VISIBLE
            } else {
                binding.textViewSelectedAddress.visibility = View.GONE
            }
        }
        
        viewModel.selectedPickupTime.observe(viewLifecycleOwner) { time ->
            if (time != null) {
                val formatter = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault())
                binding.textViewSelectedTime.text = formatter.format(time)
                binding.textViewSelectedTime.visibility = View.VISIBLE
            } else {
                binding.textViewSelectedTime.visibility = View.GONE
            }
        }
        
        viewModel.loading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBarCheckout.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.btnPlaceOrder.isEnabled = !isLoading
        }
        
        viewModel.error.observe(viewLifecycleOwner) { error ->
            if (!error.isNullOrEmpty()) {
                Toast.makeText(requireContext(), error, Toast.LENGTH_LONG).show()
            }
        }
        
        viewModel.orderComplete.observe(viewLifecycleOwner) { order ->
            order?.let {
                findNavController().navigate(
                    R.id.action_checkoutFragment_to_orderConfirmationFragment,
                    Bundle().apply {
                        putString("orderId", order.id)
                    }
                )
            }
        }
    }
    
    private fun checkLocationPermissionAndFindShops() {
        when {
            ContextCompat.checkSelfPermission(
                requireContext(),
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED -> {
                getLastLocation()
            }
            shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION) -> {
                showLocationPermissionRationale()
            }
            else -> {
                requestPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
            }
        }
    }
    
    private fun showLocationPermissionRationale() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.location_permission_needed)
            .setMessage(R.string.location_permission_rationale)
            .setPositiveButton(R.string.ok) { _, _ ->
                requestPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }
    
    private fun getLastLocation() {
        if (ContextCompat.checkSelfPermission(
                requireContext(),
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            binding.progressBarCheckout.visibility = View.VISIBLE
            
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                if (location != null) {
                    viewModel.loadNearbyShops(location.latitude, location.longitude)
                    showShopSelectionDialog()
                } else {
                    Toast.makeText(
                        requireContext(),
                        R.string.location_not_available,
                        Toast.LENGTH_SHORT
                    ).show()
                    binding.progressBarCheckout.visibility = View.GONE
                }
            }
        }
    }
    
    private fun showShopSelectionDialog() {
        val shopAdapter = ShopAdapter { shop ->
            viewModel.selectShop(shop)
            // Dismiss dialog
        }
        
        viewModel.nearbyShops.observe(viewLifecycleOwner) { shops ->
            binding.progressBarCheckout.visibility = View.GONE
            
            if (shops.isEmpty()) {
                Toast.makeText(
                    requireContext(),
                    R.string.no_shops_found,
                    Toast.LENGTH_SHORT
                ).show()
                return@observe
            }
            
            MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.select_shop)
                .setAdapter(shopAdapter) { dialog, which ->
                    val shop = shops[which]
                    viewModel.selectShop(shop)
                    dialog.dismiss()
                }
                .setNegativeButton(R.string.cancel, null)
                .show()
            
            shopAdapter.submitList(shops)
        }
    }
    
    private fun showAddressSelectionDialog() {
        val addressAdapter = AddressAdapter { address ->
            viewModel.selectAddress(address)
            // Dismiss dialog
        }
        
        viewModel.userAddresses.observe(viewLifecycleOwner) { addresses ->
            if (addresses.isEmpty()) {
                findNavController().navigate(R.id.action_checkoutFragment_to_addressListFragment)
                return@observe
            }
            
            MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.select_address)
                .setAdapter(addressAdapter) { dialog, which ->
                    val address = addresses[which]
                    viewModel.selectAddress(address)
                    dialog.dismiss()
                }
                .setPositiveButton(R.string.add_new_address) { _, _ ->
                    findNavController().navigate(R.id.action_checkoutFragment_to_addressFormFragment)
                }
                .setNegativeButton(R.string.cancel, null)
                .show()
            
            addressAdapter.submitList(addresses)
        }
    }
    
    private fun showDateTimePicker() {
        val calendar = Calendar.getInstance()
        
        // Date picker
        val datePicker = MaterialDatePicker.Builder.datePicker()
            .setTitleText(R.string.select_date)
            .setSelection(MaterialDatePicker.todayInUtcMilliseconds())
            .build()
        
        datePicker.addOnPositiveButtonClickListener { dateInMillis ->
            // Time picker
            val timePicker = MaterialTimePicker.Builder()
                .setTitleText(R.string.select_time)
                .setHour(calendar.get(Calendar.HOUR_OF_DAY))
                .setMinute(calendar.get(Calendar.MINUTE))
                .build()
            
            timePicker.addOnPositiveButtonClickListener {
                calendar.timeInMillis = dateInMillis
                calendar.set(Calendar.HOUR_OF_DAY, timePicker.hour)
                calendar.set(Calendar.MINUTE, timePicker.minute)
                
                viewModel.selectPickupTime(calendar.time)
            }
            
            timePicker.show(childFragmentManager, "timePicker")
        }
        
        datePicker.show(childFragmentManager, "datePicker")
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 