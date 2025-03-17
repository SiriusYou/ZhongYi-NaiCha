package com.zhongyi.naicha.ui.screens.community

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.zhongyi.naicha.R
import com.zhongyi.naicha.databinding.FragmentPostDetailBinding
import com.zhongyi.naicha.ui.adapters.CommentAdapter
import com.zhongyi.naicha.ui.viewmodels.PostDetailViewModel
import dagger.hilt.android.AndroidEntryPoint
import java.text.SimpleDateFormat
import java.util.Locale

@AndroidEntryPoint
class PostDetailFragment : Fragment() {

    private var _binding: FragmentPostDetailBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: PostDetailViewModel by viewModels()
    private val args: PostDetailFragmentArgs by navArgs()
    
    private lateinit var commentAdapter: CommentAdapter
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPostDetailBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupToolbar()
        setupRecyclerView()
        setupClickListeners()
        observeViewModel()
        
        // Load post details
        viewModel.loadPostDetails(args.postId)
    }
    
    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
    }
    
    private fun setupRecyclerView() {
        commentAdapter = CommentAdapter(
            onCommentLikeClicked = { comment ->
                viewModel.toggleCommentLike(comment.id, comment.isLiked)
            },
            onReplyClicked = { comment ->
                showReplyDialog(comment.id)
            }
        )
        
        binding.rvComments.apply {
            adapter = commentAdapter
            layoutManager = LinearLayoutManager(requireContext())
            
            // Add scroll listener for pagination
            addOnScrollListener(object : RecyclerView.OnScrollListener() {
                override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                    super.onScrolled(recyclerView, dx, dy)
                    
                    val layoutManager = recyclerView.layoutManager as LinearLayoutManager
                    val visibleItemCount = layoutManager.childCount
                    val totalItemCount = layoutManager.itemCount
                    val firstVisibleItemPosition = layoutManager.findFirstVisibleItemPosition()
                    
                    if ((visibleItemCount + firstVisibleItemPosition) >= totalItemCount
                        && firstVisibleItemPosition >= 0
                    ) {
                        viewModel.loadMoreComments()
                    }
                }
            })
        }
    }
    
    private fun setupClickListeners() {
        // Like button
        binding.btnLike.setOnClickListener {
            viewModel.togglePostLike()
        }
        
        // Bookmark button
        binding.btnBookmark.setOnClickListener {
            viewModel.togglePostBookmark()
        }
        
        // Comment button
        binding.btnComment.setOnClickListener {
            showCommentDialog()
        }
        
        // Share button
        binding.btnShare.setOnClickListener {
            // Implement sharing functionality
            Toast.makeText(requireContext(), R.string.share_coming_soon, Toast.LENGTH_SHORT).show()
        }
        
        // Submit comment
        binding.layoutAddComment.btnSend.setOnClickListener {
            val commentText = binding.layoutAddComment.etComment.text.toString().trim()
            if (commentText.isNotEmpty()) {
                viewModel.addComment(commentText)
                binding.layoutAddComment.etComment.text.clear()
            }
        }
    }
    
    private fun observeViewModel() {
        // Observe post details
        viewModel.post.observe(viewLifecycleOwner) { post ->
            post?.let {
                // Set post details
                binding.tvPostTitle.text = it.title
                binding.tvPostContent.text = it.content
                binding.tvAuthorName.text = it.authorName
                
                // Format date
                val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
                binding.tvPostDate.text = dateFormat.format(it.createdAt)
                
                // Set author avatar
                if (!it.authorAvatar.isNullOrEmpty()) {
                    Glide.with(requireContext())
                        .load(it.authorAvatar)
                        .placeholder(R.drawable.ic_person)
                        .circleCrop()
                        .into(binding.ivAuthorAvatar)
                } else {
                    binding.ivAuthorAvatar.setImageResource(R.drawable.ic_person)
                }
                
                // Set post images if available
                if (!it.images.isNullOrEmpty()) {
                    binding.ivPostImage.visibility = View.VISIBLE
                    Glide.with(requireContext())
                        .load(it.images[0])
                        .placeholder(R.drawable.placeholder_image)
                        .into(binding.ivPostImage)
                } else {
                    binding.ivPostImage.visibility = View.GONE
                }
                
                // Set like count and state
                binding.btnLike.text = it.likeCount.toString()
                binding.btnLike.isSelected = it.isLiked
                
                // Set comment count
                binding.btnComment.text = it.commentCount.toString()
                
                // Set bookmark state
                binding.btnBookmark.isSelected = it.isBookmarked
                
                // Show tags if available
                if (!it.tags.isNullOrEmpty()) {
                    binding.chipGroupTags.visibility = View.VISIBLE
                    binding.chipGroupTags.removeAllViews()
                    
                    it.tags.forEach { tag ->
                        val chip = com.google.android.material.chip.Chip(requireContext())
                        chip.text = tag
                        chip.isClickable = false
                        binding.chipGroupTags.addView(chip)
                    }
                } else {
                    binding.chipGroupTags.visibility = View.GONE
                }
            }
        }
        
        // Observe comments
        viewModel.comments.observe(viewLifecycleOwner) { comments ->
            commentAdapter.submitList(comments)
            
            // Show empty state if there are no comments
            binding.tvNoComments.visibility = if (comments.isEmpty()) View.VISIBLE else View.GONE
        }
        
        // Observe loading states
        viewModel.isLoadingPost.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.scrollView.visibility = if (isLoading) View.INVISIBLE else View.VISIBLE
        }
        
        viewModel.isLoadingComments.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBarComments.visibility = if (isLoading && commentAdapter.itemCount == 0) View.VISIBLE else View.GONE
        }
        
        viewModel.isAddingComment.observe(viewLifecycleOwner) { isAdding ->
            binding.layoutAddComment.progressBar.visibility = if (isAdding) View.VISIBLE else View.GONE
            binding.layoutAddComment.btnSend.isEnabled = !isAdding
        }
        
        // Observe error states
        viewModel.error.observe(viewLifecycleOwner) { error ->
            if (!error.isNullOrEmpty()) {
                Toast.makeText(requireContext(), error, Toast.LENGTH_SHORT).show()
                viewModel.resetErrors()
            }
        }
        
        viewModel.commentsError.observe(viewLifecycleOwner) { error ->
            if (!error.isNullOrEmpty()) {
                Toast.makeText(requireContext(), error, Toast.LENGTH_SHORT).show()
                viewModel.resetErrors()
            }
        }
    }
    
    private fun showCommentDialog() {
        binding.layoutAddComment.root.visibility = View.VISIBLE
        binding.layoutAddComment.etComment.requestFocus()
    }
    
    private fun showReplyDialog(parentId: String) {
        binding.layoutAddComment.root.visibility = View.VISIBLE
        binding.layoutAddComment.etComment.requestFocus()
        binding.layoutAddComment.etComment.hint = getString(R.string.reply_to_comment)
        
        // Update send button to handle reply
        binding.layoutAddComment.btnSend.setOnClickListener {
            val replyText = binding.layoutAddComment.etComment.text.toString().trim()
            if (replyText.isNotEmpty()) {
                viewModel.addComment(replyText, parentId)
                binding.layoutAddComment.etComment.text.clear()
                binding.layoutAddComment.etComment.hint = getString(R.string.add_comment)
                
                // Reset click listener
                setupClickListeners()
            }
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 