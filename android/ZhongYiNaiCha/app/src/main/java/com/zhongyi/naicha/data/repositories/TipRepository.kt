package com.zhongyi.naicha.data.repositories

import com.zhongyi.naicha.data.api.ApiClient
import com.zhongyi.naicha.data.storage.TokenManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import java.util.Calendar
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TipRepository @Inject constructor(
    private val tokenManager: TokenManager
) {
    
    private val knowledgeService = ApiClient.knowledgeService
    
    // Fallback tips in case API call fails
    private val fallbackTips = listOf(
        "喝茶养生，贵在坚持。 (Drinking tea for health benefits requires consistency.)",
        "茶性平和，适合大多数体质。 (Tea has a balanced nature and is suitable for most body constitutions.)",
        "春饮花茶，夏饮绿茶，秋饮青茶，冬饮红茶。 (Drink flower tea in spring, green tea in summer, oolong in autumn, and black tea in winter.)",
        "饭后一小时再饮茶，有助消化不伤胃。 (Drink tea one hour after meals to aid digestion without harming the stomach.)",
        "晚上少饮茶，以免影响睡眠。 (Drink less tea in the evening to avoid affecting sleep.)",
        "生姜红茶可缓解感冒初期症状。 (Ginger black tea can relieve early cold symptoms.)",
        "菊花茶清热解毒，适合夏季饮用。 (Chrysanthemum tea clears heat and detoxifies, suitable for summer.)",
        "乌龙茶有助消脂减肥。 (Oolong tea helps burn fat and lose weight.)",
        "普洱茶有助降脂降压。 (Pu'er tea helps lower cholesterol and blood pressure.)",
        "玫瑰花茶理气解郁，适合女性饮用。 (Rose tea regulates qi and relieves depression, suitable for women.)"
    )
    
    /**
     * Get daily health tip
     * First tries to get from API, falls back to local tips if API fails
     */
    suspend fun getDailyTip(): String = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            
            // If user is logged in, try to get personalized tip
            if (token != null) {
                // TODO: Implement API call to get personalized tip
                // For now, return a fallback tip based on day of year
            }
            
            // Return fallback tip based on day of year
            return@withContext getFallbackTip()
        } catch (e: IOException) {
            // Network error, return fallback tip
            return@withContext getFallbackTip()
        } catch (e: Exception) {
            // Other errors, return fallback tip
            return@withContext getFallbackTip()
        }
    }
    
    /**
     * Get fallback tip based on day of year
     */
    private fun getFallbackTip(): String {
        val calendar = Calendar.getInstance()
        val dayOfYear = calendar.get(Calendar.DAY_OF_YEAR)
        
        // Use day of year to select a tip
        val index = dayOfYear % fallbackTips.size
        return fallbackTips[index]
    }
} 