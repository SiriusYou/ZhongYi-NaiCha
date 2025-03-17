package com.zhongyi.naicha.ui.viewmodels

import android.os.CountDownTimer
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.User
import com.zhongyi.naicha.data.repository.UserRepository
import kotlinx.coroutines.launch
import java.io.IOException

class AuthViewModel : ViewModel() {
    
    private val userRepository = UserRepository()
    
    // Login state
    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading
    
    private val _loginResult = MutableLiveData<Boolean>()
    val loginResult: LiveData<Boolean> = _loginResult
    
    private val _registrationResult = MutableLiveData<Boolean>()
    val registrationResult: LiveData<Boolean> = _registrationResult
    
    private val _errorMessage = MutableLiveData<String>()
    val errorMessage: LiveData<String> = _errorMessage
    
    // Verification code state
    private val _verificationCodeSent = MutableLiveData<Boolean>()
    val verificationCodeSent: LiveData<Boolean> = _verificationCodeSent
    
    private val _countdownTime = MutableLiveData<Int>()
    val countdownTime: LiveData<Int> = _countdownTime
    
    private var countdownTimer: CountDownTimer? = null
    
    /**
     * Login with phone number and verification code
     */
    fun login(phoneNumber: String, verificationCode: String) {
        _isLoading.value = true
        
        viewModelScope.launch {
            try {
                val result = userRepository.login(phoneNumber, verificationCode)
                _loginResult.value = result
                
                if (!result) {
                    _errorMessage.value = "Login failed. Please check your credentials."
                }
            } catch (e: IOException) {
                _loginResult.value = false
                _errorMessage.value = "Network error: ${e.message}"
            } catch (e: Exception) {
                _loginResult.value = false
                _errorMessage.value = "Error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Register with phone number, verification code, and nickname
     */
    fun register(phoneNumber: String, verificationCode: String, nickname: String = "") {
        _isLoading.value = true
        
        viewModelScope.launch {
            try {
                val user = User(
                    phoneNumber = phoneNumber,
                    nickname = nickname.ifEmpty { "User_${phoneNumber.takeLast(4)}" }
                )
                
                val result = userRepository.register(user, verificationCode)
                _registrationResult.value = result
                
                if (!result) {
                    _errorMessage.value = "Registration failed. Please try again."
                }
            } catch (e: IOException) {
                _registrationResult.value = false
                _errorMessage.value = "Network error: ${e.message}"
            } catch (e: Exception) {
                _registrationResult.value = false
                _errorMessage.value = "Error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Login with third-party provider
     */
    fun loginWithThirdParty(provider: String) {
        _isLoading.value = true
        
        viewModelScope.launch {
            try {
                val result = userRepository.loginWithThirdParty(provider)
                _loginResult.value = result
                
                if (!result) {
                    _errorMessage.value = "$provider login failed. Please try again."
                }
            } catch (e: IOException) {
                _loginResult.value = false
                _errorMessage.value = "Network error: ${e.message}"
            } catch (e: Exception) {
                _loginResult.value = false
                _errorMessage.value = "Error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Request verification code for phone number
     */
    fun requestVerificationCode(phoneNumber: String) {
        _isLoading.value = true
        
        viewModelScope.launch {
            try {
                val result = userRepository.requestVerificationCode(phoneNumber)
                _verificationCodeSent.value = result
                
                if (!result) {
                    _errorMessage.value = "Failed to send verification code. Please try again."
                }
            } catch (e: IOException) {
                _verificationCodeSent.value = false
                _errorMessage.value = "Network error: ${e.message}"
            } catch (e: Exception) {
                _verificationCodeSent.value = false
                _errorMessage.value = "Error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Start countdown timer for verification code resend
     */
    fun startVerificationCodeCountdown(seconds: Int = 60) {
        countdownTimer?.cancel()
        
        countdownTimer = object : CountDownTimer(seconds * 1000L, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                _countdownTime.value = (millisUntilFinished / 1000).toInt()
            }
            
            override fun onFinish() {
                _countdownTime.value = 0
            }
        }.start()
    }
    
    override fun onCleared() {
        super.onCleared()
        countdownTimer?.cancel()
    }
} 