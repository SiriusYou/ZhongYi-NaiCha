package com.zhongyi.naicha.ui.screens.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.zhongyi.naicha.MainActivity
import com.zhongyi.naicha.R
import com.zhongyi.naicha.databinding.ActivityRegisterBinding
import com.zhongyi.naicha.ui.viewmodels.AuthViewModel

class RegisterActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityRegisterBinding
    private lateinit var viewModel: AuthViewModel
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        viewModel = ViewModelProvider(this)[AuthViewModel::class.java]
        
        setupUI()
        observeViewModel()
    }
    
    private fun setupUI() {
        // Set up the registration button click listener
        binding.btnRegister.setOnClickListener {
            val phoneNumber = binding.etPhoneNumber.text.toString()
            val verificationCode = binding.etVerificationCode.text.toString()
            val nickname = binding.etNickname.text.toString()
            
            if (phoneNumber.isNotEmpty() && verificationCode.isNotEmpty()) {
                viewModel.register(phoneNumber, verificationCode, nickname)
            } else {
                Toast.makeText(this, getString(R.string.error_fields_empty), Toast.LENGTH_SHORT).show()
            }
        }
        
        // Set up the request verification code button
        binding.btnRequestCode.setOnClickListener {
            val phoneNumber = binding.etPhoneNumber.text.toString()
            
            if (phoneNumber.isNotEmpty()) {
                viewModel.requestVerificationCode(phoneNumber)
            } else {
                Toast.makeText(this, getString(R.string.error_phone_empty), Toast.LENGTH_SHORT).show()
            }
        }
        
        // Set up the privacy policy checkbox
        binding.cbAgreeTerms.setOnCheckedChangeListener { _, isChecked ->
            binding.btnRegister.isEnabled = isChecked
        }
        
        // Navigate back to login
        binding.tvLogin.setOnClickListener {
            finish()
        }
        
        // Navigate to privacy policy
        binding.tvPrivacyPolicy.setOnClickListener {
            // TODO: Navigate to privacy policy screen
            Toast.makeText(this, getString(R.string.privacy_policy), Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun observeViewModel() {
        // Observe loading state
        viewModel.isLoading.observe(this) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.btnRegister.isEnabled = !isLoading && binding.cbAgreeTerms.isChecked
            binding.btnRequestCode.isEnabled = !isLoading
        }
        
        // Observe registration result
        viewModel.registrationResult.observe(this) { success ->
            if (success) {
                Toast.makeText(this, getString(R.string.registration_success), Toast.LENGTH_SHORT).show()
                
                // Navigate to health profile setup or main activity
                val intent = Intent(this, HealthProfileSetupActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            }
        }
        
        // Observe error messages
        viewModel.errorMessage.observe(this) { errorMsg ->
            if (errorMsg.isNotEmpty()) {
                Toast.makeText(this, errorMsg, Toast.LENGTH_LONG).show()
            }
        }
        
        // Observe verification code status
        viewModel.verificationCodeSent.observe(this) { sent ->
            if (sent) {
                Toast.makeText(this, getString(R.string.verification_code_sent), Toast.LENGTH_SHORT).show()
                // Start countdown for resend
                binding.btnRequestCode.isEnabled = false
                viewModel.startVerificationCodeCountdown()
            }
        }
        
        // Observe countdown timer
        viewModel.countdownTime.observe(this) { time ->
            if (time > 0) {
                binding.btnRequestCode.text = getString(R.string.resend_code_countdown, time)
            } else {
                binding.btnRequestCode.text = getString(R.string.request_verification_code)
                binding.btnRequestCode.isEnabled = true
            }
        }
    }
} 