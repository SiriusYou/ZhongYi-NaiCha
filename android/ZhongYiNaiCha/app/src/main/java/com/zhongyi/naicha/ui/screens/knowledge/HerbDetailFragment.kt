package com.zhongyi.naicha.ui.screens.knowledge

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.navArgs
import com.bumptech.glide.Glide
import com.zhongyi.naicha.R
import com.zhongyi.naicha.databinding.FragmentHerbDetailBinding
import com.zhongyi.naicha.ui.viewmodels.HerbDetailViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class HerbDetailFragment : Fragment() {

    private var _binding: FragmentHerbDetailBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: HerbDetailViewModel by viewModels()
    private val args: HerbDetailFragmentArgs by navArgs()
    
    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHerbDetailBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        // Load herb details based on the ID passed from previous screen
        viewModel.loadHerbDetails(args.herbId)
        
        setupObservers()
    }
    
    private fun setupObservers() {
        // Observe herb details
        viewModel.herb.observe(viewLifecycleOwner) { herb ->
            herb?.let {
                // Set herb data to views
                binding.tvHerbName.text = it.name
                binding.tvHerbProperties.text = it.properties
                binding.tvHerbUsage.text = it.commonUsage
                binding.tvHerbBenefits.text = it.benefits
                binding.tvHerbPrecautions.text = it.precautions
                
                // Load image if available
                if (!it.imageUrl.isNullOrEmpty()) {
                    Glide.with(requireContext())
                        .load(it.imageUrl)
                        .placeholder(R.drawable.placeholder_herb)
                        .error(R.drawable.error_image)
                        .into(binding.ivHerbImage)
                } else {
                    binding.ivHerbImage.setImageResource(R.drawable.placeholder_herb)
                }
            }
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
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 