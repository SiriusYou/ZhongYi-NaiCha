package com.zhongyi.naicha.data.api.responses

import com.google.gson.annotations.SerializedName
import com.zhongyi.naicha.data.models.Post

data class PostResponse(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("message")
    val message: String?,
    
    @SerializedName("post")
    val post: Post?
) 