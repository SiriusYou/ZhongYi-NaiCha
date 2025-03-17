package com.zhongyi.naicha.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.Article
import com.zhongyi.naicha.databinding.ItemArticleBinding
import java.text.SimpleDateFormat
import java.util.Locale

class ArticleAdapter(
    private val onArticleClick: (Article) -> Unit
) : ListAdapter<Article, ArticleAdapter.ArticleViewHolder>(ArticleDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ArticleViewHolder {
        val binding = ItemArticleBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ArticleViewHolder(binding, onArticleClick)
    }

    override fun onBindViewHolder(holder: ArticleViewHolder, position: Int) {
        val article = getItem(position)
        holder.bind(article)
    }

    class ArticleViewHolder(
        private val binding: ItemArticleBinding,
        private val onArticleClick: (Article) -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

        fun bind(article: Article) {
            binding.apply {
                tvArticleTitle.text = article.title
                tvArticleDescription.text = article.description
                tvArticleCategory.text = article.category.name
                tvArticleDate.text = article.publishDate?.let { dateFormat.format(it) } ?: ""

                // Load image if available
                if (!article.imageUrl.isNullOrEmpty()) {
                    Glide.with(root.context)
                        .load(article.imageUrl)
                        .placeholder(R.drawable.placeholder_image)
                        .error(R.drawable.error_image)
                        .into(ivArticleImage)
                } else {
                    ivArticleImage.setImageResource(R.drawable.placeholder_image)
                }

                // Set click listener
                root.setOnClickListener {
                    onArticleClick(article)
                }
            }
        }
    }

    class ArticleDiffCallback : DiffUtil.ItemCallback<Article>() {
        override fun areItemsTheSame(oldItem: Article, newItem: Article): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Article, newItem: Article): Boolean {
            return oldItem == newItem
        }
    }
} 