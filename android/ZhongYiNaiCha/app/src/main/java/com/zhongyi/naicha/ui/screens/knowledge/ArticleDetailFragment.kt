package com.zhongyi.naicha.ui.screens.knowledge

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.navArgs
import com.bumptech.glide.Glide
import com.zhongyi.naicha.R
import com.zhongyi.naicha.databinding.FragmentArticleDetailBinding
import com.zhongyi.naicha.ui.viewmodels.ArticleDetailViewModel
import dagger.hilt.android.AndroidEntryPoint
import java.text.SimpleDateFormat
import java.util.Locale

@AndroidEntryPoint
class ArticleDetailFragment : Fragment() {

    private var _binding: FragmentArticleDetailBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: ArticleDetailViewModel by viewModels()
    private val args: ArticleDetailFragmentArgs by navArgs()
    
    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentArticleDetailBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        // Load article details based on the ID passed from previous screen
        viewModel.loadArticleDetails(args.articleId)
        
        setupObservers()
        setupClickListeners()
    }
    
    private fun setupClickListeners() {
        binding.btnBookmark.setOnClickListener {
            viewModel.toggleBookmark()
        }
    }
    
    private fun setupObservers() {
        // Observe article details
        viewModel.article.observe(viewLifecycleOwner) { article ->
            article?.let {
                // Set article data to views
                binding.tvArticleTitle.text = it.title
                binding.tvArticleCategory.text = it.category.name
                
                // Format and set date
                val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                binding.tvArticleDate.text = it.publishDate?.let { date -> dateFormat.format(date) } ?: ""
                
                // Set content
                binding.tvArticleContent.text = it.content
                
                // Load image if available
                if (!it.imageUrl.isNullOrEmpty()) {
                    Glide.with(requireContext())
                        .load(it.imageUrl)
                        .placeholder(R.drawable.placeholder_image)
                        .error(R.drawable.error_image)
                        .into(binding.ivArticleImage)
                } else {
                    binding.ivArticleImage.setImageResource(R.drawable.placeholder_image)
                }
            }
        }
        
        // Observe bookmark state
        viewModel.isBookmarked.observe(viewLifecycleOwner) { isBookmarked ->
            updateBookmarkIcon(isBookmarked)
        }
        
        // Observe loading state
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.scrollView.visibility = if (isLoading) View.GONE else View.VISIBLE
        }
        
        // Observe error state
        viewModel.error.observe(viewLifecycleOwner) { errorMessage ->
            if (errorMessage != null) {
                binding.tvError.visibility = View.VISIBLE
                binding.tvError.text = errorMessage
                binding.scrollView.visibility = View.GONE
            } else {
                binding.tvError.visibility = View.GONE
            }
        }
    }
    
    private fun updateBookmarkIcon(isBookmarked: Boolean) {
        binding.btnBookmark.setImageResource(
            if (isBookmarked) R.drawable.ic_bookmark else R.drawable.ic_bookmark_border
        )
        
        // Show toast message when bookmark state changes
        val message = if (isBookmarked) R.string.bookmark_added else R.string.bookmark_removed
        Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 