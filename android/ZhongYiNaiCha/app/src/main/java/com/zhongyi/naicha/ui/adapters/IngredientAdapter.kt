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
import com.zhongyi.naicha.data.models.Ingredient

class IngredientAdapter(
    private val onIngredientClicked: ((Ingredient) -> Unit)? = null
) : ListAdapter<Ingredient, IngredientAdapter.IngredientViewHolder>(IngredientDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): IngredientViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_ingredient, parent, false)
        return IngredientViewHolder(view)
    }

    override fun onBindViewHolder(holder: IngredientViewHolder, position: Int) {
        val ingredient = getItem(position)
        holder.bind(ingredient)
    }

    inner class IngredientViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val ivIngredientImage: ImageView = itemView.findViewById(R.id.ivIngredientImage)
        private val tvIngredientName: TextView = itemView.findViewById(R.id.tvIngredientName)
        private val tvIngredientAmount: TextView = itemView.findViewById(R.id.tvIngredientAmount)
        private val tvIngredientNote: TextView = itemView.findViewById(R.id.tvIngredientNote)
        private val ivHerbBadge: ImageView = itemView.findViewById(R.id.ivHerbBadge)

        init {
            itemView.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION && onIngredientClicked != null) {
                    onIngredientClicked.invoke(getItem(position))
                }
            }
        }

        fun bind(ingredient: Ingredient) {
            tvIngredientName.text = ingredient.name
            tvIngredientAmount.text = ingredient.amount
            
            // Set note if available
            if (ingredient.note.isNullOrEmpty()) {
                tvIngredientNote.visibility = View.GONE
            } else {
                tvIngredientNote.visibility = View.VISIBLE
                tvIngredientNote.text = ingredient.note
            }
            
            // Show herb badge if the ingredient is an herb
            ivHerbBadge.visibility = if (ingredient.isHerb) View.VISIBLE else View.GONE
            
            // Load image if available
            if (!ingredient.imageUrl.isNullOrEmpty()) {
                Glide.with(itemView.context)
                    .load(ingredient.imageUrl)
                    .placeholder(R.drawable.placeholder_ingredient)
                    .error(R.drawable.placeholder_ingredient)
                    .circleCrop()
                    .into(ivIngredientImage)
            } else {
                ivIngredientImage.setImageResource(R.drawable.placeholder_ingredient)
            }
        }
    }

    private class IngredientDiffCallback : DiffUtil.ItemCallback<Ingredient>() {
        override fun areItemsTheSame(oldItem: Ingredient, newItem: Ingredient): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Ingredient, newItem: Ingredient): Boolean {
            return oldItem == newItem
        }
    }
} 