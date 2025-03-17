package com.zhongyi.naicha.ui.adapters

import android.net.Uri
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.zhongyi.naicha.R
import com.zhongyi.naicha.databinding.ItemImagePreviewBinding

class ImagePreviewAdapter(
    private val onDeleteClicked: (Int) -> Unit
) : ListAdapter<Uri, ImagePreviewAdapter.ImageViewHolder>(ImageDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ImageViewHolder {
        val binding = ItemImagePreviewBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ImageViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ImageViewHolder, position: Int) {
        val imageUri = getItem(position)
        holder.bind(imageUri)
    }

    inner class ImageViewHolder(
        private val binding: ItemImagePreviewBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        init {
            binding.btnDelete.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onDeleteClicked(position)
                }
            }
        }

        fun bind(imageUri: Uri) {
            Glide.with(binding.imageView.context)
                .load(imageUri)
                .placeholder(R.drawable.placeholder_image)
                .centerCrop()
                .into(binding.imageView)
        }
    }

    private class ImageDiffCallback : DiffUtil.ItemCallback<Uri>() {
        override fun areItemsTheSame(oldItem: Uri, newItem: Uri): Boolean {
            return oldItem == newItem
        }

        override fun areContentsTheSame(oldItem: Uri, newItem: Uri): Boolean {
            return oldItem == newItem
        }
    }
} 