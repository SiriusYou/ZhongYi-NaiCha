/**
 * Order Service
 * Handles tea ordering, shop location, and payment processing
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Mock shop database for initial setup
const shops = [
  {
    id: 'shop001',
    name: '养生茶坊',
    address: '北京市朝阳区建国路88号',
    location: {
      latitude: 39.9123,
      longitude: 116.4668
    },
    contactPhone: '010-12345678',
    businessHours: '9:00-21:00',
    imageUrl: 'https://example.com/images/shop1.jpg',
    rating: 4.8,
    specialties: ['养生花茶', '红枣枸杞奶茶'],
    description: '专注于传统中医养生茶饮，环境优雅，提供多种定制服务'
  },
  {
    id: 'shop002',
    name: '清和茶馆',
    address: '上海市静安区南京西路1618号',
    location: {
      latitude: 31.2304,
      longitude: 121.4737
    },
    contactPhone: '021-87654321',
    businessHours: '10:00-22:00',
    imageUrl: 'https://example.com/images/shop2.jpg',
    rating: 4.6,
    specialties: ['薄荷绿茶', '四季养生奶茶'],
    description: '结合传统与现代的茶饮店，提供舒适的环境和优质的服务'
  },
  {
    id: 'shop003',
    name: '悦享茶品',
    address: '广州市天河区天河路385号',
    location: {
      latitude: 23.1291,
      longitude: 113.3270
    },
    contactPhone: '020-98765432',
    businessHours: '9:30-22:30',
    imageUrl: 'https://example.com/images/shop3.jpg',
    rating: 4.7,
    specialties: ['姜茶奶茶', '玫瑰花茶'],
    description: '南方风味，融合岭南茶文化，提供多种养生茶饮和健康小食'
  }
];

// Mock orders database for initial setup
const orders = [];

// Mock payment gateways for initial setup
const paymentGateways = [
  {
    id: 'pg001',
    name: 'WeChat Pay',
    type: 'mobile_payment',
    redirectUrl: 'https://pay.example.com/wechat/',
    logoUrl: 'https://example.com/images/wechat_pay.png'
  },
  {
    id: 'pg002',
    name: 'Alipay',
    type: 'mobile_payment',
    redirectUrl: 'https://pay.example.com/alipay/',
    logoUrl: 'https://example.com/images/alipay.png'
  },
  {
    id: 'pg003',
    name: 'Union Pay',
    type: 'card_payment',
    redirectUrl: 'https://pay.example.com/unionpay/',
    logoUrl: 'https://example.com/images/unionpay.png'
  }
];

/**
 * Get all shops with optional filtering
 */
router.get('/shops', (req, res) => {
  try {
    const { latitude, longitude, radius, search } = req.query;
    
    let filteredShops = [...shops];
    
    // Filter by location (nearby shops)
    if (latitude && longitude && radius) {
      // In a real implementation, this would use geospatial queries
      // For demonstration, using a simplistic approach
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      const radiusKm = parseFloat(radius);
      
      filteredShops = filteredShops.filter(shop => {
        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = deg2rad(shop.location.latitude - userLat);
        const dLng = deg2rad(shop.location.longitude - userLng);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(deg2rad(userLat)) * Math.cos(deg2rad(shop.location.latitude)) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance <= radiusKm;
      });
    }
    
    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredShops = filteredShops.filter(shop => 
        shop.name.toLowerCase().includes(searchLower) ||
        shop.address.toLowerCase().includes(searchLower) ||
        shop.specialties.some(s => s.toLowerCase().includes(searchLower))
      );
    }
    
    return res.status(200).json({
      count: filteredShops.length,
      shops: filteredShops
    });
  } catch (error) {
    console.error('Get shops error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve shops', 
      error: error.message 
    });
  }
});

/**
 * Get shop by ID
 */
router.get('/shops/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const shop = shops.find(s => s.id === id);
    
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    return res.status(200).json(shop);
  } catch (error) {
    console.error('Get shop by ID error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve shop', 
      error: error.message 
    });
  }
});

/**
 * Get available pickup times for a shop
 */
router.get('/shops/:id/pickup-slots', (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    
    const shop = shops.find(s => s.id === id);
    
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    // Generate available pickup times
    // In a real implementation, this would check actual availability
    
    const requestDate = date ? new Date(date) : new Date();
    const tomorrow = new Date(requestDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Format: YYYY-MM-DD
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    const today = formatDate(requestDate);
    const nextDay = formatDate(tomorrow);
    
    // Business hours from shop data
    const [openTime, closeTime] = shop.businessHours.split('-');
    
    // Generate time slots every 30 minutes
    const generateTimeSlots = (date, startTime, endTime) => {
      const slots = [];
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      let currentHour = startHour;
      let currentMinute = startMinute;
      
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const formattedHour = currentHour.toString().padStart(2, '0');
        const formattedMinute = currentMinute.toString().padStart(2, '0');
        
        slots.push({
          date,
          time: `${formattedHour}:${formattedMinute}`,
          available: Math.random() > 0.3 // Simulate 70% availability
        });
        
        // Increment by 30 minutes
        currentMinute += 30;
        if (currentMinute >= 60) {
          currentHour += 1;
          currentMinute = 0;
        }
      }
      
      return slots;
    };
    
    // Generate slots for today and tomorrow
    const todaySlots = generateTimeSlots(today, openTime, closeTime);
    const tomorrowSlots = generateTimeSlots(nextDay, openTime, closeTime);
    
    return res.status(200).json({
      shopId: id,
      shopName: shop.name,
      availableSlots: {
        [today]: todaySlots,
        [nextDay]: tomorrowSlots
      }
    });
  } catch (error) {
    console.error('Get pickup slots error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve pickup slots', 
      error: error.message 
    });
  }
});

/**
 * Create a new order
 */
router.post('/', (req, res) => {
  try {
    const { 
      userId, 
      items, 
      shopId, 
      pickupTime, 
      pickupDate,
      specialInstructions
    } = req.body;
    
    // Validate request
    if (!userId || !items || !shopId) {
      return res.status(400).json({ 
        message: 'Missing required fields. UserId, items, and shopId are required.' 
      });
    }
    
    if (!items.length) {
      return res.status(400).json({ 
        message: 'Order must contain at least one item' 
      });
    }
    
    // Find shop
    const shop = shops.find(s => s.id === shopId);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    // Calculate order total
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + tax;
    
    // Create new order
    const newOrder = {
      id: 'ord-' + uuidv4(),
      userId,
      items,
      shopId,
      shopName: shop.name,
      pickupTime,
      pickupDate,
      specialInstructions,
      subtotal,
      tax,
      total,
      status: 'pending_payment',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save order
    orders.push(newOrder);
    
    // Return order with payment options
    return res.status(201).json({
      message: 'Order created successfully',
      order: newOrder,
      paymentOptions: paymentGateways
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ 
      message: 'Failed to create order', 
      error: error.message 
    });
  }
});

/**
 * Get order by ID
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const order = orders.find(o => o.id === id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    return res.status(200).json(order);
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve order', 
      error: error.message 
    });
  }
});

/**
 * Get orders for a user
 */
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    let userOrders = orders.filter(o => o.userId === userId);
    
    // Filter by status if provided
    if (status) {
      userOrders = userOrders.filter(o => o.status === status);
    }
    
    // Sort by creation date (newest first)
    userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return res.status(200).json({
      count: userOrders.length,
      orders: userOrders
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve user orders', 
      error: error.message 
    });
  }
});

/**
 * Initiate payment for an order
 */
router.post('/:id/payment', (req, res) => {
  try {
    const { id } = req.params;
    const { paymentGatewayId } = req.body;
    
    // Validate request
    if (!paymentGatewayId) {
      return res.status(400).json({ 
        message: 'Payment gateway ID is required' 
      });
    }
    
    // Find order
    const orderIndex = orders.findIndex(o => o.id === id);
    
    if (orderIndex === -1) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Find payment gateway
    const paymentGateway = paymentGateways.find(pg => pg.id === paymentGatewayId);
    
    if (!paymentGateway) {
      return res.status(404).json({ message: 'Payment gateway not found' });
    }
    
    // Update order status
    orders[orderIndex].status = 'payment_initiated';
    orders[orderIndex].updatedAt = new Date();
    orders[orderIndex].paymentGateway = paymentGatewayId;
    
    // Generate payment URL (in real implementation, this would involve security tokens)
    const paymentUrl = `${paymentGateway.redirectUrl}?order_id=${id}&amount=${orders[orderIndex].total.toFixed(2)}`;
    
    return res.status(200).json({
      message: 'Payment initiated successfully',
      orderId: id,
      paymentGateway: paymentGateway.name,
      paymentUrl,
      order: orders[orderIndex]
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    return res.status(500).json({ 
      message: 'Failed to initiate payment', 
      error: error.message 
    });
  }
});

/**
 * Update order status (payment callback)
 */
router.post('/:id/payment-callback', (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionId } = req.body;
    
    // Validate request
    if (!status) {
      return res.status(400).json({ 
        message: 'Payment status is required' 
      });
    }
    
    // Find order
    const orderIndex = orders.findIndex(o => o.id === id);
    
    if (orderIndex === -1) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Update order status
    const validStatuses = ['paid', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid payment status', 
        validStatuses 
      });
    }
    
    orders[orderIndex].status = status === 'paid' ? 'processing' : status;
    orders[orderIndex].updatedAt = new Date();
    
    if (transactionId) {
      orders[orderIndex].transactionId = transactionId;
    }
    
    return res.status(200).json({
      message: 'Order status updated successfully',
      order: orders[orderIndex]
    });
  } catch (error) {
    console.error('Payment callback error:', error);
    return res.status(500).json({ 
      message: 'Failed to process payment callback', 
      error: error.message 
    });
  }
});

/**
 * Helper function to convert degrees to radians
 */
function deg2rad(deg) {
  return deg * (Math.PI/180);
}

module.exports = router; 