package com.zhongyi.naicha.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.TextView
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.Shop

class ShopAdapter(private val onShopSelected: (Shop) -> Unit) : BaseAdapter() {
    
    private var shops: List<Shop> = emptyList()
    
    fun submitList(newShops: List<Shop>) {
        shops = newShops
        notifyDataSetChanged()
    }
    
    override fun getCount(): Int = shops.size
    
    override fun getItem(position: Int): Shop = shops[position]
    
    override fun getItemId(position: Int): Long = position.toLong()
    
    override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
        val view = convertView ?: LayoutInflater.from(parent.context)
            .inflate(R.layout.item_shop, parent, false)
        
        val shop = getItem(position)
        
        view.findViewById<TextView>(R.id.textViewShopName).text = shop.name
        view.findViewById<TextView>(R.id.textViewShopAddress).text = shop.address
        
        val distanceText = if (shop.distance != null) {
            view.context.getString(R.string.distance_format, shop.distance)
        } else {
            ""
        }
        view.findViewById<TextView>(R.id.textViewDistance).text = distanceText
        
        view.setOnClickListener { onShopSelected(shop) }
        
        return view
    }
} 