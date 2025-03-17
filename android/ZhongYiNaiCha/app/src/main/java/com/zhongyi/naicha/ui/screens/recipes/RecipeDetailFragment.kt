package com.zhongyi.naicha.ui.screens.recipes

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import com.bumptech.glide.Glide
import com.zhongyi.naicha.R
import com.zhongyi.naicha.data.models.Ingredient
import com.zhongyi.naicha.data.models.Recipe
import com.zhongyi.naicha.databinding.FragmentRecipeDetailBinding
import com.zhongyi.naicha.ui.adapters.IngredientAdapter
import com.zhongyi.naicha.ui.adapters.RelatedRecipeAdapter
import com.zhongyi.naicha.ui.adapters.StepAdapter
import com.zhongyi.naicha.ui.viewmodels.RecipeDetailViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class RecipeDetailFragment : Fragment() {

    private var _binding: FragmentRecipeDetailBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: RecipeDetailViewModel by viewModels()
    private val args: RecipeDetailFragmentArgs by navArgs()
    
    private val ingredientAdapter = IngredientAdapter { ingredient ->
        navigateToIngredientDetail(ingredient)
    }
    
    private val stepAdapter = StepAdapter()
    
    private val relatedRecipeAdapter = RelatedRecipeAdapter { recipe ->
        navigateToRecipeDetail(recipe)
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentRecipeDetailBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupToolbar()
        setupRecyclerViews()
        setupClickListeners()
        observeViewModel()
        
        // Load recipe details
        viewModel.loadRecipeDetails(args.recipeId)
    }
    
    private fun setupToolbar() {
        // Set up the toolbar with back navigation
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
    }
    
    private fun setupRecyclerViews() {
        // Set up ingredients recycler view
        binding.rvIngredients.adapter = ingredientAdapter
        
        // Set up steps recycler view
        binding.rvSteps.adapter = stepAdapter
        
        // Set up related recipes recycler view
        binding.rvRelatedRecipes.adapter = relatedRecipeAdapter
    }
    
    private fun setupClickListeners() {
        // Handle order button click
        binding.fabOrder.setOnClickListener {
            // Navigate to order screen or show ordering options
            Toast.makeText(context, "订购功能即将推出", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun observeViewModel() {
        // Observe recipe details
        viewModel.recipe.observe(viewLifecycleOwner) { recipe ->
            recipe?.let {
                updateUI(it)
            }
        }
        
        // Observe related recipes
        viewModel.relatedRecipes.observe(viewLifecycleOwner) { recipes ->
            relatedRecipeAdapter.submitList(recipes)
        }
        
        // Observe loading state
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.appBarLayout.visibility = if (isLoading) View.INVISIBLE else View.VISIBLE
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
    
    private fun updateUI(recipe: Recipe) {
        // Set recipe name
        binding.tvRecipeName.text = recipe.name
        
        // Set recipe image
        if (!recipe.imageUrl.isNullOrEmpty()) {
            Glide.with(requireContext())
                .load(recipe.imageUrl)
                .placeholder(R.drawable.placeholder_recipe)
                .error(R.drawable.placeholder_recipe)
                .into(binding.ivRecipeImage)
        }
        
        // Set rating
        binding.ratingBar.rating = recipe.rating
        binding.tvRatingCount.text = "(${recipe.reviewCount})"
        
        // Set category and season
        binding.tvCategory.text = recipe.category.name
        if (recipe.suitableSeasons.isNotEmpty()) {
            binding.tvSeason.visibility = View.VISIBLE
            binding.tvSeason.text = recipe.suitableSeasons[0]
        } else {
            binding.tvSeason.visibility = View.GONE
        }
        
        // Set difficulty and preparation time
        binding.tvDifficulty.text = recipe.difficulty
        binding.tvPrepTime.text = "${recipe.preparationTime}分钟"
        
        // Set description
        binding.tvDescription.text = recipe.description
        
        // Set ingredients
        ingredientAdapter.submitList(recipe.ingredients)
        
        // Set steps
        stepAdapter.setSteps(recipe.steps)
        
        // Set nutrition info
        binding.tvCalories.text = "${recipe.nutritionInfo.calories} 卡路里"
        binding.tvProtein.text = "${recipe.nutritionInfo.protein} 克"
        binding.tvFat.text = "${recipe.nutritionInfo.fat} 克"
        binding.tvCarbs.text = "${recipe.nutritionInfo.carbs} 克"
        binding.tvSugar.text = "${recipe.nutritionInfo.sugar} 克"
        
        // Set nutrition notes
        if (recipe.nutritionInfo.notes.isNullOrEmpty()) {
            binding.tvNutritionNotes.visibility = View.GONE
        } else {
            binding.tvNutritionNotes.visibility = View.VISIBLE
            binding.tvNutritionNotes.text = recipe.nutritionInfo.notes
        }
        
        // Set health benefits
        binding.tvBenefits.text = recipe.healthBenefits.joinToString("\n") { "• $it" }
        
        // Set suitable constitutions
        binding.tvConstitutions.text = recipe.suitableConstitutions.joinToString("\n") { "• $it" }
    }
    
    private fun navigateToIngredientDetail(ingredient: Ingredient) {
        // Only navigate to herb detail if the ingredient is an herb
        if (ingredient.isHerb) {
            // Create the action to navigate to herb detail
            val action = RecipeDetailFragmentDirections
                .actionRecipeDetailFragmentToHerbDetailFragment(ingredient.id)
            findNavController().navigate(action)
        }
    }
    
    private fun navigateToRecipeDetail(recipe: Recipe) {
        // Create the action to navigate to recipe detail
        val action = RecipeDetailFragmentDirections
            .actionRecipeDetailFragmentSelf(recipe.id)
        findNavController().navigate(action)
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 