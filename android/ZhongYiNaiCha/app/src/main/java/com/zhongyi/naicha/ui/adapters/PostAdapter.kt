package com.zhongyi.naicha.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.Post
import com.zhongyi.naicha.databinding.ItemPostBinding
import java.text.SimpleDateFormat
import java.util.Locale

class PostAdapter(
    private val onPostClicked: (Post) -> Unit,
    private val onLikeClicked: (Post) -> Unit,
    private val onBookmarkClicked: (Post) -> Unit
) : ListAdapter<Post, PostAdapter.PostViewHolder>(PostDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PostViewHolder {
        val binding = ItemPostBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return PostViewHolder(binding)
    }

    override fun onBindViewHolder(holder: PostViewHolder, position: Int) {
        val post = getItem(position)
        holder.bind(post)
    }

    inner class PostViewHolder(
        private val binding: ItemPostBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        init {
            binding.root.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onPostClicked(getItem(position))
                }
            }

            binding.btnLike.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onLikeClicked(getItem(position))
                }
            }

            binding.btnBookmark.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onBookmarkClicked(getItem(position))
                }
            }
        }

        fun bind(post: Post) {
            binding.apply {
                // Set post content
                tvTitle.text = post.title
                tvContent.text = post.content
                tvAuthorName.text = post.authorName
                
                // Format date
                val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
                tvDate.text = dateFormat.format(post.createdAt)
                
                // Set like and comment counts
                btnLike.text = post.likeCount.toString()
                btnComment.text = post.commentCount.toString()
                
                // Set like and bookmark states
                btnLike.isSelected = post.isLiked
                btnBookmark.isSelected = post.isBookmarked
                
                // Load author avatar
                if (!post.authorAvatar.isNullOrEmpty()) {
                    Glide.with(ivAuthorAvatar.context)
                        .load(post.authorAvatar)
                        .placeholder(R.drawable.ic_person)
                        .circleCrop()
                        .into(ivAuthorAvatar)
                } else {
                    ivAuthorAvatar.setImageResource(R.drawable.ic_person)
                }
                
                // Load post image if available
                if (!post.images.isNullOrEmpty()) {
                    ivPostImage.visibility = View.VISIBLE
                    Glide.with(ivPostImage.context)
                        .load(post.images[0])
                        .placeholder(R.drawable.placeholder_image)
                        .into(ivPostImage)
                } else {
                    ivPostImage.visibility = View.GONE
                }
                
                // Show category badge if available
                if (post.category.isNotEmpty()) {
                    chipCategory.visibility = View.VISIBLE
                    
                    val categoryName = when (post.category) {
                        "health" -> "健康问题"
                        "wellness" -> "养生经验"
                        "tea" -> "茶饮分享"
                        "question" -> "求助问答"
                        "expert" -> "专家咨询"
                        "health_check" -> "健康打卡"
                        "expert_qa" -> "专家问答"
                        else -> post.category
                    }
                    
                    chipCategory.text = categoryName
                } else {
                    chipCategory.visibility = View.GONE
                }
            }
        }
    }

    private class PostDiffCallback : DiffUtil.ItemCallback<Post>() {
        override fun areItemsTheSame(oldItem: Post, newItem: Post): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Post, newItem: Post): Boolean {
            return oldItem == newItem
        }
    }
} 