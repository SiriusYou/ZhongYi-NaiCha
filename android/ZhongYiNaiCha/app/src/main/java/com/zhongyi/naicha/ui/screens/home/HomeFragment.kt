package com.zhongyi.naicha.ui.screens.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.zhongyi.naicha.R
import com.zhongyi.naicha.databinding.FragmentHomeBinding
import com.zhongyi.naicha.ui.adapters.RecommendationAdapter
import com.zhongyi.naicha.ui.adapters.SeasonalRecommendationAdapter
import com.zhongyi.naicha.ui.viewmodels.HomeViewModel

class HomeFragment : Fragment() {
    
    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var viewModel: HomeViewModel
    private lateinit var recommendationAdapter: RecommendationAdapter
    private lateinit var seasonalAdapter: SeasonalRecommendationAdapter
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        // Initialize ViewModel
        viewModel = ViewModelProvider(this)[HomeViewModel::class.java]
        
        setupUI()
        observeViewModel()
        
        // Load personalized recommendations
        viewModel.loadRecommendations()
        
        // Load seasonal recommendations
        viewModel.loadSeasonalRecommendations()
    }
    
    private fun setupUI() {
        // Setup personalized recommendations RecyclerView
        recommendationAdapter = RecommendationAdapter { recipe ->
            // Handle recipe click: navigate to recipe detail
            // Todo: Implement navigation to Recipe Detail
            Toast.makeText(context, "Selected recipe: ${recipe.name}", Toast.LENGTH_SHORT).show()
        }
        
        binding.rvPersonalizedRecommendations.apply {
            layoutManager = LinearLayoutManager(context, LinearLayoutManager.HORIZONTAL, false)
            adapter = recommendationAdapter
        }
        
        // Setup seasonal recommendations RecyclerView
        seasonalAdapter = SeasonalRecommendationAdapter { recipe ->
            // Handle recipe click: navigate to recipe detail
            // Todo: Implement navigation to Recipe Detail
            Toast.makeText(context, "Selected seasonal recipe: ${recipe.name}", Toast.LENGTH_SHORT).show()
        }
        
        binding.rvSeasonalRecommendations.apply {
            layoutManager = LinearLayoutManager(context, LinearLayoutManager.HORIZONTAL, false)
            adapter = seasonalAdapter
        }
        
        // Setup swipe refresh
        binding.swipeRefresh.setOnRefreshListener {
            viewModel.loadRecommendations()
            viewModel.loadSeasonalRecommendations()
        }
        
        // Setup daily health tip
        viewModel.loadDailyTip()
    }
    
    private fun observeViewModel() {
        // Observe personalized recommendations
        viewModel.recommendations.observe(viewLifecycleOwner) { recipes ->
            recommendationAdapter.submitList(recipes)
            
            // Show empty state if there are no recommendations
            binding.emptyStatePersonalized.visibility = if (recipes.isEmpty()) View.VISIBLE else View.GONE
        }
        
        // Observe seasonal recommendations
        viewModel.seasonalRecommendations.observe(viewLifecycleOwner) { recipes ->
            seasonalAdapter.submitList(recipes)
            
            // Show empty state if there are no seasonal recommendations
            binding.emptyStateSeasonal.visibility = if (recipes.isEmpty()) View.VISIBLE else View.GONE
        }
        
        // Observe daily health tip
        viewModel.dailyTip.observe(viewLifecycleOwner) { tip ->
            binding.tvDailyTip.text = tip
        }
        
        // Observe loading state
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.swipeRefresh.isRefreshing = isLoading
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        }
        
        // Observe error messages
        viewModel.errorMessage.observe(viewLifecycleOwner) { errorMsg ->
            if (errorMsg.isNotEmpty()) {
                Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
            }
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 