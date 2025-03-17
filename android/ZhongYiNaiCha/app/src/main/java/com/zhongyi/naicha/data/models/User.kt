package com.zhongyi.naicha.data.models

data class User(
    val id: String = "",
    val phoneNumber: String,
    val nickname: String = "",
    val avatar: String = "",
    val email: String = "",
    val createTime: Long = System.currentTimeMillis(),
    val lastLoginTime: Long = System.currentTimeMillis()
) 