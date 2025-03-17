package com.zhongyi.naicha.ui.screens.knowledge

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.SearchView
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.tabs.TabLayout
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.Article
import com.zhongyi.naicha.data.models.Herb
import com.zhongyi.naicha.databinding.FragmentKnowledgeCenterBinding
import com.zhongyi.naicha.ui.adapters.ArticleAdapter
import com.zhongyi.naicha.ui.adapters.HerbAdapter
import com.zhongyi.naicha.ui.viewmodels.KnowledgeCenterViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class KnowledgeCenterFragment : Fragment() {

    private var _binding: FragmentKnowledgeCenterBinding? = null
    private val binding get() = _binding!!

    private val viewModel: KnowledgeCenterViewModel by viewModels()
    
    private lateinit var articleAdapter: ArticleAdapter
    private lateinit var herbAdapter: HerbAdapter
    
    private var currentTab = 0 // 0 for articles, 1 for herbs
    private var isLoading = false
    private var isLastPage = false

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentKnowledgeCenterBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupAdapters()
        setupTabLayout()
        setupSearchView()
        setupRecyclerView()
        observeViewModel()
        
        // Load initial data
        viewModel.loadArticles()
    }
    
    private fun setupAdapters() {
        articleAdapter = ArticleAdapter { article ->
            navigateToArticleDetail(article)
        }
        
        herbAdapter = HerbAdapter { herb ->
            navigateToHerbDetail(herb)
        }
    }
    
    private fun setupTabLayout() {
        binding.tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab) {
                currentTab = tab.position
                binding.recyclerView.adapter = if (currentTab == 0) articleAdapter else herbAdapter
                
                // Clear search and load data for the selected tab
                binding.searchView.setQuery("", false)
                if (currentTab == 0) {
                    viewModel.loadArticles()
                } else {
                    viewModel.loadHerbs()
                }
            }
            
            override fun onTabUnselected(tab: TabLayout.Tab) {}
            override fun onTabReselected(tab: TabLayout.Tab) {}
        })
    }
    
    private fun setupSearchView() {
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String): Boolean {
                if (query.isNotEmpty()) {
                    searchContent(query)
                }
                return true
            }
            
            override fun onQueryTextChange(newText: String): Boolean {
                if (newText.isEmpty()) {
                    // Reset to showing all items
                    if (currentTab == 0) {
                        viewModel.loadArticles()
                    } else {
                        viewModel.loadHerbs()
                    }
                }
                return true
            }
        })
    }
    
    private fun searchContent(query: String) {
        if (currentTab == 0) {
            viewModel.searchArticles(query)
        } else {
            viewModel.searchHerbs(query)
        }
    }
    
    private fun setupRecyclerView() {
        val layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.layoutManager = layoutManager
        binding.recyclerView.adapter = articleAdapter
        
        // Add scroll listener for pagination
        binding.recyclerView.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                super.onScrolled(recyclerView, dx, dy)
                
                val visibleItemCount = layoutManager.childCount
                val totalItemCount = layoutManager.itemCount
                val firstVisibleItemPosition = layoutManager.findFirstVisibleItemPosition()
                
                if (!isLoading && !isLastPage) {
                    if ((visibleItemCount + firstVisibleItemPosition) >= totalItemCount
                        && firstVisibleItemPosition >= 0
                        && totalItemCount >= 10) {
                        
                        // Load more items
                        if (currentTab == 0) {
                            viewModel.loadMoreArticles()
                        } else {
                            viewModel.loadMoreHerbs()
                        }
                    }
                }
            }
        })
    }
    
    private fun observeViewModel() {
        // Observe articles
        viewModel.articles.observe(viewLifecycleOwner) { articles ->
            articleAdapter.submitList(articles)
            handleEmptyState(articles.isEmpty())
        }
        
        // Observe herbs
        viewModel.herbs.observe(viewLifecycleOwner) { herbs ->
            herbAdapter.submitList(herbs)
            handleEmptyState(herbs.isEmpty())
        }
        
        // Observe loading state
        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            isLoading = loading
            binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
            if (!loading) {
                binding.recyclerView.visibility = View.VISIBLE
            }
        }
        
        // Observe error state
        viewModel.error.observe(viewLifecycleOwner) { errorMessage ->
            binding.tvError.visibility = if (errorMessage != null) View.VISIBLE else View.GONE
            if (errorMessage != null) {
                binding.tvError.text = errorMessage
                binding.recyclerView.visibility = View.GONE
                binding.progressBar.visibility = View.GONE
            }
        }
        
        // Observe last page flag for pagination
        viewModel.isLastPage.observe(viewLifecycleOwner) { lastPage ->
            isLastPage = lastPage
        }
    }
    
    private fun handleEmptyState(isEmpty: Boolean) {
        binding.tvEmpty.visibility = if (isEmpty && !viewModel.isLoading.value!!) View.VISIBLE else View.GONE
    }
    
    private fun navigateToArticleDetail(article: Article) {
        // TODO: Implement navigation to article detail
        // val action = KnowledgeCenterFragmentDirections.actionKnowledgeCenterFragmentToArticleDetailFragment(article.id)
        // findNavController().navigate(action)
    }
    
    private fun navigateToHerbDetail(herb: Herb) {
        // TODO: Implement navigation to herb detail
        // val action = KnowledgeCenterFragmentDirections.actionKnowledgeCenterFragmentToHerbDetailFragment(herb.id)
        // findNavController().navigate(action)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 