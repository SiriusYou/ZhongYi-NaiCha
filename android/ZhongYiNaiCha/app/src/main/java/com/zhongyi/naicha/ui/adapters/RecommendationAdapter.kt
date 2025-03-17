package com.zhongyi.naicha.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.request.RequestOptions
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.Recipe
import com.zhongyi.naicha.databinding.ItemRecommendationBinding

class RecommendationAdapter(
    private val onItemClick: (Recipe) -> Unit
) : ListAdapter<Recipe, RecommendationAdapter.RecommendationViewHolder>(DIFF_CALLBACK) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecommendationViewHolder {
        val binding = ItemRecommendationBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return RecommendationViewHolder(binding)
    }

    override fun onBindViewHolder(holder: RecommendationViewHolder, position: Int) {
        val recipe = getItem(position)
        holder.bind(recipe)
    }

    inner class RecommendationViewHolder(
        private val binding: ItemRecommendationBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        init {
            binding.root.setOnClickListener {
                val position = bindingAdapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onItemClick(getItem(position))
                }
            }
        }

        fun bind(recipe: Recipe) {
            binding.tvRecipeName.text = recipe.name
            binding.tvDifficulty.text = recipe.difficulty
            binding.tvPreparationTime.text = itemView.context.getString(
                R.string.preparation_time_minutes,
                recipe.preparationTime
            )
            
            // Load image
            Glide.with(itemView.context)
                .load(recipe.imageUrl)
                .apply(
                    RequestOptions()
                        .placeholder(R.drawable.placeholder_recipe)
                        .error(R.drawable.error_recipe)
                )
                .into(binding.ivRecipeImage)
                
            // Set health benefits
            val benefitsText = recipe.healthBenefits.joinToString(", ")
            binding.tvHealthBenefits.text = benefitsText
            
            // Set rating
            binding.ratingBar.rating = recipe.rating?.average?.toFloat() ?: 0f
        }
    }

    companion object {
        private val DIFF_CALLBACK = object : DiffUtil.ItemCallback<Recipe>() {
            override fun areItemsTheSame(oldItem: Recipe, newItem: Recipe): Boolean {
                return oldItem.id == newItem.id
            }

            override fun areContentsTheSame(oldItem: Recipe, newItem: Recipe): Boolean {
                return oldItem == newItem
            }
        }
    }
} 