package com.zhongyi.naicha

import android.app.Application
import android.content.Context

class ZhongYiNaiChaApplication : Application() {
    
    companion object {
        lateinit var appContext: Context
            private set
    }
    
    override fun onCreate() {
        super.onCreate()
        appContext = applicationContext
    }
} 