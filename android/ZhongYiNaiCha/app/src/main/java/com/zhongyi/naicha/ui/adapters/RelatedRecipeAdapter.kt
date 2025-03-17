package com.zhongyi.naicha.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.RatingBar
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.Recipe

class RelatedRecipeAdapter(
    private val onRecipeClicked: (Recipe) -> Unit
) : ListAdapter<Recipe, RelatedRecipeAdapter.RecipeViewHolder>(RecipeDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecipeViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_recipe_card, parent, false)
        return RecipeViewHolder(view)
    }

    override fun onBindViewHolder(holder: RecipeViewHolder, position: Int) {
        val recipe = getItem(position)
        holder.bind(recipe)
    }

    inner class RecipeViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val ivRecipeImage: ImageView = itemView.findViewById(R.id.ivRecipeImage)
        private val tvRecipeName: TextView = itemView.findViewById(R.id.tvRecipeName)
        private val tvRecipeCategory: TextView = itemView.findViewById(R.id.tvRecipeCategory)
        private val ratingBar: RatingBar = itemView.findViewById(R.id.ratingBar)
        private val tvPrepTime: TextView = itemView.findViewById(R.id.tvPrepTime)

        init {
            itemView.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onRecipeClicked(getItem(position))
                }
            }
        }

        fun bind(recipe: Recipe) {
            tvRecipeName.text = recipe.name
            tvRecipeCategory.text = recipe.category.name
            ratingBar.rating = recipe.rating
            tvPrepTime.text = "${recipe.preparationTime}分钟"
            
            // Load image if available
            if (!recipe.imageUrl.isNullOrEmpty()) {
                Glide.with(itemView.context)
                    .load(recipe.imageUrl)
                    .placeholder(R.drawable.placeholder_recipe)
                    .error(R.drawable.placeholder_recipe)
                    .centerCrop()
                    .into(ivRecipeImage)
            } else {
                ivRecipeImage.setImageResource(R.drawable.placeholder_recipe)
            }
        }
    }

    private class RecipeDiffCallback : DiffUtil.ItemCallback<Recipe>() {
        override fun areItemsTheSame(oldItem: Recipe, newItem: Recipe): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Recipe, newItem: Recipe): Boolean {
            return oldItem == newItem
        }
    }
} 