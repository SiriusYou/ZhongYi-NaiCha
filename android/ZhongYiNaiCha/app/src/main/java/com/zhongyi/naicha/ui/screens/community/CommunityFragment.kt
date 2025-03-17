package com.zhongyi.naicha.ui.screens.community

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.tabs.TabLayout
import com.zhongyi.naicha.R
import com.zhongyi.naicha.databinding.FragmentCommunityBinding
import com.zhongyi.naicha.ui.adapters.PostAdapter
import com.zhongyi.naicha.ui.viewmodels.CommunityViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class CommunityFragment : Fragment() {

    private var _binding: FragmentCommunityBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: CommunityViewModel by viewModels()
    
    private lateinit var postAdapter: PostAdapter
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCommunityBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupRecyclerView()
        setupTabs()
        setupClickListeners()
        observeViewModel()
    }
    
    private fun setupRecyclerView() {
        postAdapter = PostAdapter(
            onPostClicked = { post ->
                findNavController().navigate(
                    CommunityFragmentDirections.actionCommunityFragmentToPostDetailFragment(post.id)
                )
            },
            onLikeClicked = { post ->
                viewModel.togglePostLike(post.id)
            },
            onBookmarkClicked = { post ->
                viewModel.togglePostBookmark(post.id)
            }
        )
        
        binding.rvPosts.apply {
            adapter = postAdapter
            layoutManager = LinearLayoutManager(requireContext())
            
            // Add scroll listener for pagination
            addOnScrollListener(object : RecyclerView.OnScrollListener() {
                override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                    super.onScrolled(recyclerView, dx, dy)
                    
                    val layoutManager = recyclerView.layoutManager as LinearLayoutManager
                    val visibleItemCount = layoutManager.childCount
                    val totalItemCount = layoutManager.itemCount
                    val firstVisibleItemPosition = layoutManager.findFirstVisibleItemPosition()
                    
                    if (!binding.swipeRefresh.isRefreshing) {
                        if ((visibleItemCount + firstVisibleItemPosition) >= totalItemCount
                            && firstVisibleItemPosition >= 0
                        ) {
                            viewModel.loadMorePosts()
                        }
                    }
                }
            })
        }
    }
    
    private fun setupTabs() {
        val tabLayout = binding.tabLayout
        
        // Add tabs
        tabLayout.addTab(tabLayout.newTab().setText(R.string.all_posts))
        tabLayout.addTab(tabLayout.newTab().setText(R.string.health_check_in))
        tabLayout.addTab(tabLayout.newTab().setText(R.string.expert_qa))
        
        // Set tab selection listener
        tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) {
                when (tab?.position) {
                    0 -> viewModel.loadPosts(null) // All posts
                    1 -> viewModel.loadPosts("health_check") // Health check-in
                    2 -> viewModel.loadPosts("expert_qa") // Expert Q&A
                }
            }
            
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            
            override fun onTabReselected(tab: TabLayout.Tab?) {
                // Refresh when tab is reselected
                when (tab?.position) {
                    0 -> viewModel.loadPosts(null) // All posts
                    1 -> viewModel.loadPosts("health_check") // Health check-in
                    2 -> viewModel.loadPosts("expert_qa") // Expert Q&A
                }
            }
        })
    }
    
    private fun setupClickListeners() {
        // Set up new post button
        binding.fabCreatePost.setOnClickListener {
            if (viewModel.isLoggedIn.value == true) {
                findNavController().navigate(
                    CommunityFragmentDirections.actionCommunityFragmentToCreatePostFragment()
                )
            } else {
                Toast.makeText(
                    requireContext(),
                    R.string.login_required,
                    Toast.LENGTH_SHORT
                ).show()
                
                // Navigate to login
                findNavController().navigate(R.id.action_global_loginFragment)
            }
        }
        
        // Set up swipe refresh
        binding.swipeRefresh.setOnRefreshListener {
            viewModel.loadPosts(viewModel.selectedCategory.value)
        }
    }
    
    private fun observeViewModel() {
        // Observe posts
        viewModel.posts.observe(viewLifecycleOwner) { posts ->
            postAdapter.submitList(posts)
            
            // Show empty state if there are no posts
            binding.tvEmptyState.visibility = if (posts.isEmpty()) View.VISIBLE else View.GONE
        }
        
        // Observe loading state
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.swipeRefresh.isRefreshing = isLoading
            binding.progressBar.visibility = if (isLoading && postAdapter.itemCount == 0) View.VISIBLE else View.GONE
        }
        
        // Observe error state
        viewModel.error.observe(viewLifecycleOwner) { error ->
            if (!error.isNullOrEmpty()) {
                Toast.makeText(requireContext(), error, Toast.LENGTH_SHORT).show()
                viewModel.resetError()
            }
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 