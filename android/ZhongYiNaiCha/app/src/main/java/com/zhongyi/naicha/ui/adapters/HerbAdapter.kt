package com.zhongyi.naicha.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.Herb
import com.zhongyi.naicha.databinding.ItemHerbBinding

class HerbAdapter(
    private val onHerbClick: (Herb) -> Unit
) : ListAdapter<Herb, HerbAdapter.HerbViewHolder>(HerbDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HerbViewHolder {
        val binding = ItemHerbBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return HerbViewHolder(binding, onHerbClick)
    }

    override fun onBindViewHolder(holder: HerbViewHolder, position: Int) {
        val herb = getItem(position)
        holder.bind(herb)
    }

    class HerbViewHolder(
        private val binding: ItemHerbBinding,
        private val onHerbClick: (Herb) -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(herb: Herb) {
            binding.apply {
                tvHerbName.text = herb.name
                tvHerbProperties.text = herb.properties
                tvHerbUsage.text = herb.commonUsage

                // Load image if available
                if (!herb.imageUrl.isNullOrEmpty()) {
                    Glide.with(root.context)
                        .load(herb.imageUrl)
                        .placeholder(R.drawable.placeholder_herb)
                        .error(R.drawable.error_image)
                        .into(ivHerbImage)
                } else {
                    ivHerbImage.setImageResource(R.drawable.placeholder_herb)
                }

                // Set click listener
                root.setOnClickListener {
                    onHerbClick(herb)
                }
            }
        }
    }

    class HerbDiffCallback : DiffUtil.ItemCallback<Herb>() {
        override fun areItemsTheSame(oldItem: Herb, newItem: Herb): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Herb, newItem: Herb): Boolean {
            return oldItem == newItem
        }
    }
} 