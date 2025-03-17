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
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
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
            showAddToCartDialog()
        }
        
        // Add cart icon to toolbar
        binding.toolbar.inflateMenu(R.menu.menu_recipe_detail)
        binding.toolbar.setOnMenuItemClickListener { menuItem ->
            when (menuItem.itemId) {
                R.id.action_view_cart -> {
                    navigateToCart()
                    true
                }
                else -> false
            }
        }
    }
    
    private fun showAddToCartDialog() {
        val recipe = viewModel.recipe.value ?: return
        
        val quantities = arrayOf("1", "2", "3", "4", "5")
        var selectedQuantity = 1
        
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.add_to_cart))
            .setSingleChoiceItems(quantities, 0) { _, which ->
                selectedQuantity = which + 1
            }
            .setPositiveButton(getString(R.string.add_to_cart)) { _, _ ->
                viewModel.addToCart(quantity = selectedQuantity)
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }
    
    private fun navigateToCart() {
        findNavController().navigate(
            RecipeDetailFragmentDirections.actionRecipeDetailFragmentToCartFragment()
        )
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
        
        // Observe add to cart success
        viewModel.addToCartSuccess.observe(viewLifecycleOwner) { success ->
            if (success) {
                Snackbar.make(
                    binding.root,
                    getString(R.string.add_to_cart_success),
                    Snackbar.LENGTH_LONG
                ).setAction(getString(R.string.view_cart)) {
                    navigateToCart()
                }.show()
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
        
        // Set price
        binding.tvPrice.text = getString(R.string.price_format, recipe.price)
        
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
        
        // Update order button text
        binding.fabOrder.text = getString(R.string.add_to_cart)
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