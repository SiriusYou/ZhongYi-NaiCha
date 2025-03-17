package com.zhongyi.naicha.data.api

import com.zhongyi.naicha.data.api.responses.BaseResponse
import com.zhongyi.naicha.data.api.responses.OrderListResponse
import com.zhongyi.naicha.data.api.responses.OrderResponse
import com.zhongyi.naicha.data.api.responses.ShopListResponse
import retrofit2.Response
import retrofit2.http.*

interface OrderService {

    @GET("orders")
    suspend fun getOrders(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10,
        @Query("status") status: String? = null
    ): Response<OrderListResponse>

    @GET("orders/{orderId}")
    suspend fun getOrderDetails(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String
    ): Response<OrderResponse>

    @POST("orders")
    suspend fun createOrder(
        @Header("Authorization") token: String,
        @Body orderData: Map<String, Any>
    ): Response<OrderResponse>

    @PUT("orders/{orderId}/cancel")
    suspend fun cancelOrder(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String
    ): Response<BaseResponse>

    @GET("shops")
    suspend fun getShops(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("radius") radius: Double = 10.0,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ShopListResponse>

    @GET("shops/{shopId}")
    suspend fun getShopDetails(
        @Path("shopId") shopId: String
    ): Response<BaseResponse>

    @GET("shops/{shopId}/availability")
    suspend fun getShopAvailability(
        @Path("shopId") shopId: String,
        @Query("date") date: String
    ): Response<BaseResponse>
} 