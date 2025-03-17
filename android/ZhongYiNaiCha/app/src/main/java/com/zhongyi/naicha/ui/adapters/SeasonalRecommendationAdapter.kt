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
import com.zhongyi.naicha.databinding.ItemSeasonalRecommendationBinding

class SeasonalRecommendationAdapter(
    private val onItemClick: (Recipe) -> Unit
) : ListAdapter<Recipe, SeasonalRecommendationAdapter.SeasonalViewHolder>(DIFF_CALLBACK) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SeasonalViewHolder {
        val binding = ItemSeasonalRecommendationBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return SeasonalViewHolder(binding)
    }

    override fun onBindViewHolder(holder: SeasonalViewHolder, position: Int) {
        val recipe = getItem(position)
        holder.bind(recipe)
    }

    inner class SeasonalViewHolder(
        private val binding: ItemSeasonalRecommendationBinding
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
            
            // Set suitable seasons
            val seasonsText = recipe.suitableSeasons.joinToString(", ")
            binding.tvSuitableSeasons.text = seasonsText
            
            // Load image with a different style for seasonal items
            Glide.with(itemView.context)
                .load(recipe.imageUrl)
                .apply(
                    RequestOptions()
                        .placeholder(R.drawable.placeholder_seasonal)
                        .error(R.drawable.error_recipe)
                        .centerCrop()
                )
                .into(binding.ivRecipeImage)
                
            // Set constitutions
            val constitutionsText = recipe.suitableConstitutions.joinToString(", ")
            binding.tvSuitableConstitutions.text = constitutionsText
            
            // Set description preview (limit to 50 chars)
            val descriptionPreview = if (recipe.description.length > 50) {
                recipe.description.substring(0, 50) + "..."
            } else {
                recipe.description
            }
            binding.tvDescriptionPreview.text = descriptionPreview
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