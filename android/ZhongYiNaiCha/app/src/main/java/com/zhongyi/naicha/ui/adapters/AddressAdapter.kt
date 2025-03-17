package com.zhongyi.naicha.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.TextView
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.Address

class AddressAdapter(private val onAddressSelected: (Address) -> Unit) : BaseAdapter() {
    
    private var addresses: List<Address> = emptyList()
    
    fun submitList(newAddresses: List<Address>) {
        addresses = newAddresses
        notifyDataSetChanged()
    }
    
    override fun getCount(): Int = addresses.size
    
    override fun getItem(position: Int): Address = addresses[position]
    
    override fun getItemId(position: Int): Long = position.toLong()
    
    override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
        val view = convertView ?: LayoutInflater.from(parent.context)
            .inflate(R.layout.item_address, parent, false)
        
        val address = getItem(position)
        
        view.findViewById<TextView>(R.id.textViewAddressType).text = address.type
        view.findViewById<TextView>(R.id.textViewAddressLine).text = address.formattedAddress()
        
        if (address.isDefault) {
            view.findViewById<TextView>(R.id.textViewDefaultAddress).visibility = View.VISIBLE
        } else {
            view.findViewById<TextView>(R.id.textViewDefaultAddress).visibility = View.GONE
        }
        
        view.setOnClickListener { onAddressSelected(address) }
        
        return view
    }
} 