package com.zhongyi.naicha.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.Herb

class BookmarkedHerbAdapter(
    private val onHerbClicked: (Herb) -> Unit
) : ListAdapter<Herb, BookmarkedHerbAdapter.HerbViewHolder>(HerbDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HerbViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_herb, parent, false)
        return HerbViewHolder(view)
    }

    override fun onBindViewHolder(holder: HerbViewHolder, position: Int) {
        val herb = getItem(position)
        holder.bind(herb)
    }

    inner class HerbViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val nameTextView: TextView = itemView.findViewById(R.id.tvHerbName)
        private val propertiesTextView: TextView = itemView.findViewById(R.id.tvHerbProperties)
        private val imageView: ImageView = itemView.findViewById(R.id.ivHerbImage)

        init {
            itemView.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onHerbClicked(getItem(position))
                }
            }
        }

        fun bind(herb: Herb) {
            nameTextView.text = herb.name
            propertiesTextView.text = herb.properties

            // Load image with Glide if available
            if (!herb.imageUrl.isNullOrEmpty()) {
                Glide.with(itemView.context)
                    .load(herb.imageUrl)
                    .placeholder(R.drawable.placeholder_image)
                    .error(R.drawable.placeholder_image)
                    .into(imageView)
            } else {
                imageView.setImageResource(R.drawable.placeholder_image)
            }
        }
    }

    private class HerbDiffCallback : DiffUtil.ItemCallback<Herb>() {
        override fun areItemsTheSame(oldItem: Herb, newItem: Herb): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Herb, newItem: Herb): Boolean {
            return oldItem == newItem
        }
    }
} 