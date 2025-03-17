package com.zhongyi.naicha.ui.screens.community

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.chip.Chip
import com.zhongyi.naicha.R
import com.zhongyi.naicha.databinding.FragmentCreatePostBinding
import com.zhongyi.naicha.ui.adapters.ImagePreviewAdapter
import com.zhongyi.naicha.ui.viewmodels.CommunityViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class CreatePostFragment : Fragment() {

    private var _binding: FragmentCreatePostBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: CommunityViewModel by viewModels()
    
    private val selectedImages = mutableListOf<Uri>()
    private lateinit var imageAdapter: ImagePreviewAdapter
    
    private val getImages = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.let { data ->
                // Handle multiple images
                if (data.clipData != null) {
                    val count = data.clipData!!.itemCount
                    for (i in 0 until count) {
                        val imageUri = data.clipData!!.getItemAt(i).uri
                        selectedImages.add(imageUri)
                    }
                } else if (data.data != null) {
                    // Handle single image
                    val imageUri = data.data!!
                    selectedImages.add(imageUri)
                }
                
                updateImagePreview()
            }
        }
    }
    
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            openImagePicker()
        } else {
            Toast.makeText(
                requireContext(),
                R.string.permission_required,
                Toast.LENGTH_SHORT
            ).show()
        }
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCreatePostBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupToolbar()
        setupImageRecyclerView()
        setupClickListeners()
        setupCategoryChips()
        observeViewModel()
    }
    
    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
    }
    
    private fun setupImageRecyclerView() {
        imageAdapter = ImagePreviewAdapter(
            onDeleteClicked = { position ->
                selectedImages.removeAt(position)
                updateImagePreview()
            }
        )
        
        binding.rvImages.adapter = imageAdapter
    }
    
    private fun setupClickListeners() {
        // Add image button
        binding.btnAddImage.setOnClickListener {
            checkPermissionAndOpenImagePicker()
        }
        
        // Publish button
        binding.btnPublish.setOnClickListener {
            publishPost()
        }
    }
    
    private fun setupCategoryChips() {
        val categories = listOf(
            "健康问题" to "health",
            "养生经验" to "wellness",
            "茶饮分享" to "tea",
            "求助问答" to "question",
            "专家咨询" to "expert"
        )
        
        categories.forEach { (name, tag) ->
            val chip = layoutInflater.inflate(
                R.layout.item_choice_chip,
                binding.chipGroupCategory,
                false
            ) as Chip
            
            chip.text = name
            chip.tag = tag
            binding.chipGroupCategory.addView(chip)
        }
    }
    
    private fun observeViewModel() {
        // Observe loading state
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.btnPublish.isEnabled = !isLoading
        }
        
        // Observe error state
        viewModel.error.observe(viewLifecycleOwner) { error ->
            if (!error.isNullOrEmpty()) {
                Toast.makeText(requireContext(), error, Toast.LENGTH_SHORT).show()
                viewModel.resetError()
            }
        }
    }
    
    private fun checkPermissionAndOpenImagePicker() {
        when {
            ContextCompat.checkSelfPermission(
                requireContext(),
                Manifest.permission.READ_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED -> {
                openImagePicker()
            }
            shouldShowRequestPermissionRationale(Manifest.permission.READ_EXTERNAL_STORAGE) -> {
                Toast.makeText(
                    requireContext(),
                    R.string.storage_permission_rationale,
                    Toast.LENGTH_LONG
                ).show()
                requestPermissionLauncher.launch(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
            else -> {
                requestPermissionLauncher.launch(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }
    }
    
    private fun openImagePicker() {
        val intent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
        intent.type = "image/*"
        getImages.launch(intent)
    }
    
    private fun updateImagePreview() {
        binding.rvImages.visibility = if (selectedImages.isEmpty()) View.GONE else View.VISIBLE
        imageAdapter.submitList(selectedImages.toList())
    }
    
    private fun publishPost() {
        val title = binding.etTitle.text.toString().trim()
        val content = binding.etContent.text.toString().trim()
        
        // Validate inputs
        if (title.isEmpty()) {
            binding.etTitle.error = getString(R.string.title_required)
            return
        }
        
        if (content.isEmpty()) {
            binding.etContent.error = getString(R.string.content_required)
            return
        }
        
        // Get selected category
        val selectedChipId = binding.chipGroupCategory.checkedChipId
        val category = if (selectedChipId != View.NO_ID) {
            val selectedChip = binding.chipGroupCategory.findViewById<Chip>(selectedChipId)
            selectedChip.tag as String
        } else {
            null
        }
        
        // Convert image URIs to strings (in a real app, you would upload these to a server)
        val imageUrls = selectedImages.map { it.toString() }
        
        // Create post
        viewModel.createPost(title, content, imageUrls)
        
        // Navigate back on success (the ViewModel will handle errors)
        findNavController().navigateUp()
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
} 