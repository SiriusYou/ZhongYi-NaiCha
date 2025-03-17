package com.zhongyi.naicha.ui.screens.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.zhongyi.naicha.MainActivity
import com.zhongyi.naicha.R
import com.zhongyi.naicha.databinding.ActivityHealthProfileSetupBinding
import com.zhongyi.naicha.ui.viewmodels.HealthProfileViewModel

class HealthProfileSetupActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityHealthProfileSetupBinding
    private lateinit var viewModel: HealthProfileViewModel
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHealthProfileSetupBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        viewModel = ViewModelProvider(this)[HealthProfileViewModel::class.java]
        
        setupUI()
        observeViewModel()
    }
    
    private fun setupUI() {
        // Set up gender spinner
        val genderAdapter = ArrayAdapter.createFromResource(
            this,
            R.array.gender_options,
            android.R.layout.simple_spinner_item
        ).also { adapter ->
            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            binding.spinnerGender.adapter = adapter
        }
        
        binding.spinnerGender.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                val gender = parent.getItemAtPosition(position).toString()
                viewModel.gender.value = gender
            }
            
            override fun onNothingSelected(parent: AdapterView<*>) {
                // Do nothing
            }
        }
        
        // Set up TCM constitution spinner
        val constitutionAdapter = ArrayAdapter.createFromResource(
            this,
            R.array.tcm_constitution_types,
            android.R.layout.simple_spinner_item
        ).also { adapter ->
            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            binding.spinnerConstitution.adapter = adapter
        }
        
        binding.spinnerConstitution.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                val constitution = parent.getItemAtPosition(position).toString()
                viewModel.constitution.value = constitution
            }
            
            override fun onNothingSelected(parent: AdapterView<*>) {
                // Do nothing
            }
        }
        
        // Set up save button
        binding.btnSave.setOnClickListener {
            val age = binding.etAge.text.toString()
            val height = binding.etHeight.text.toString()
            val weight = binding.etWeight.text.toString()
            
            if (age.isNotEmpty() && height.isNotEmpty() && weight.isNotEmpty()) {
                viewModel.saveHealthProfile(
                    age.toInt(),
                    height.toInt(),
                    weight.toInt()
                )
            } else {
                Toast.makeText(this, getString(R.string.error_fields_empty), Toast.LENGTH_SHORT).show()
            }
        }
        
        // Set up "Not sure" button for TCM constitution
        binding.btnTcmTest.setOnClickListener {
            // TODO: Navigate to TCM constitution assessment questionnaire
            Toast.makeText(this, getString(R.string.tcm_assessment_coming_soon), Toast.LENGTH_SHORT).show()
        }
        
        // Set up skip button
        binding.btnSkip.setOnClickListener {
            navigateToMain()
        }
    }
    
    private fun observeViewModel() {
        // Observe loading state
        viewModel.isLoading.observe(this) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.btnSave.isEnabled = !isLoading
        }
        
        // Observe save result
        viewModel.saveResult.observe(this) { success ->
            if (success) {
                Toast.makeText(this, getString(R.string.profile_saved), Toast.LENGTH_SHORT).show()
                navigateToMain()
            }
        }
        
        // Observe error messages
        viewModel.errorMessage.observe(this) { errorMsg ->
            if (errorMsg.isNotEmpty()) {
                Toast.makeText(this, errorMsg, Toast.LENGTH_LONG).show()
            }
        }
    }
    
    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
} 