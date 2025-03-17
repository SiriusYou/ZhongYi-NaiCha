package com.zhongyi.naicha.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.Comment
import com.zhongyi.naicha.databinding.ItemCommentBinding
import java.text.SimpleDateFormat
import java.util.Locale

class CommentAdapter(
    private val onCommentLikeClicked: (Comment) -> Unit,
    private val onReplyClicked: (Comment) -> Unit
) : ListAdapter<Comment, CommentAdapter.CommentViewHolder>(CommentDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CommentViewHolder {
        val binding = ItemCommentBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return CommentViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CommentViewHolder, position: Int) {
        val comment = getItem(position)
        holder.bind(comment)
    }

    inner class CommentViewHolder(
        private val binding: ItemCommentBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        init {
            binding.btnLike.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onCommentLikeClicked(getItem(position))
                }
            }

            binding.btnReply.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onReplyClicked(getItem(position))
                }
            }
        }

        fun bind(comment: Comment) {
            binding.apply {
                // Set comment content
                tvContent.text = comment.content
                tvAuthorName.text = comment.authorName
                
                // Format date
                val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
                tvDate.text = dateFormat.format(comment.createdAt)
                
                // Set like count and state
                btnLike.text = comment.likeCount.toString()
                btnLike.isSelected = comment.isLiked
                
                // Set parent reply indication
                if (comment.parentId != null) {
                    viewReplyIndicator.visibility = View.VISIBLE
                    root.setPadding(
                        root.context.resources.getDimensionPixelSize(R.dimen.reply_padding_start),
                        root.paddingTop,
                        root.paddingEnd,
                        root.paddingBottom
                    )
                } else {
                    viewReplyIndicator.visibility = View.GONE
                    root.setPadding(0, root.paddingTop, root.paddingEnd, root.paddingBottom)
                }
                
                // Load author avatar
                if (!comment.authorAvatar.isNullOrEmpty()) {
                    Glide.with(ivAuthorAvatar.context)
                        .load(comment.authorAvatar)
                        .placeholder(R.drawable.ic_person)
                        .circleCrop()
                        .into(ivAuthorAvatar)
                } else {
                    ivAuthorAvatar.setImageResource(R.drawable.ic_person)
                }
            }
        }
    }

    private class CommentDiffCallback : DiffUtil.ItemCallback<Comment>() {
        override fun areItemsTheSame(oldItem: Comment, newItem: Comment): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Comment, newItem: Comment): Boolean {
            return oldItem == newItem
        }
    }
} 