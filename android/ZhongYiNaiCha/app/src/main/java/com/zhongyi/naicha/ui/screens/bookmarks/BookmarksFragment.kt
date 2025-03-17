package com.zhongyi.naicha.ui.screens.bookmarks

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.tabs.TabLayout
import com.google.android.material.tabs.TabLayoutMediator
import com.zhongyi.naicha.data.models.Article
import com.zhongyi.naicha.data.models.Herb
import com.zhongyi.naicha.databinding.FragmentBookmarksBinding
import com.zhongyi.naicha.ui.adapters.ArticleAdapter
import com.zhongyi.naicha.ui.adapters.HerbAdapter
import com.zhongyi.naicha.ui.viewmodels.BookmarksViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class BookmarksFragment : Fragment() {

    private var _binding: FragmentBookmarksBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: BookmarksViewModel by viewModels()
    
    private lateinit var articleAdapter: ArticleAdapter
    private lateinit var herbAdapter: HerbAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentBookmarksBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupAdapters()
        setupViewPager()
        setupTabLayout()
        observeViewModel()
        
        // Load initial data
        viewModel.loadBookmarkedArticles()
        viewModel.loadBookmarkedHerbs()
    }
    
    private fun setupAdapters() {
        articleAdapter = ArticleAdapter { article ->
            navigateToArticleDetail(article)
        }
        
        herbAdapter = HerbAdapter { herb ->
            navigateToHerbDetail(herb)
        }
    }
    
    private fun setupViewPager() {
        val pagerAdapter = BookmarksPagerAdapter(this, articleAdapter, herbAdapter)
        binding.viewPager.adapter = pagerAdapter
    }
    
    private fun setupTabLayout() {
        TabLayoutMediator(binding.tabLayout, binding.viewPager) { tab, position ->
            tab.text = when (position) {
                0 -> "Articles"
                1 -> "Herbs"
                else -> null
            }
        }.attach()
    }
    
    private fun observeViewModel() {
        // Observe bookmarked articles
        viewModel.bookmarkedArticles.observe(viewLifecycleOwner) { articles ->
            articleAdapter.submitList(articles)
            updateEmptyState(0, articles.isEmpty())
        }
        
        // Observe bookmarked herbs
        viewModel.bookmarkedHerbs.observe(viewLifecycleOwner) { herbs ->
            herbAdapter.submitList(herbs)
            updateEmptyState(1, herbs.isEmpty())
        }
        
        // Observe loading state
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        }
        
        // Observe error state
        viewModel.error.observe(viewLifecycleOwner) { errorMessage ->
            if (errorMessage != null) {
                binding.tvError.visibility = View.VISIBLE
                binding.tvError.text = errorMessage
            } else {
                binding.tvError.visibility = View.GONE
            }
        }
    }
    
    private fun updateEmptyState(tabPosition: Int, isEmpty: Boolean) {
        val currentTabPosition = binding.tabLayout.selectedTabPosition
        
        if (currentTabPosition == tabPosition) {
            binding.tvEmptyState.visibility = if (isEmpty && !viewModel.isLoading.value!!) {
                View.VISIBLE
            } else {
                View.GONE
            }
        }
    }
    
    private fun navigateToArticleDetail(article: Article) {
        // Navigate to article detail
        val action = BookmarksFragmentDirections.actionBookmarksFragmentToArticleDetailFragment(article.id)
        findNavController().navigate(action)
    }
    
    private fun navigateToHerbDetail(herb: Herb) {
        // Navigate to herb detail
        val action = BookmarksFragmentDirections.actionBookmarksFragmentToHerbDetailFragment(herb.id)
        findNavController().navigate(action)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 