const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

// @route   GET api/orders
// @desc    Get all orders for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get orders for the user with pagination
    const orders = await Order.find({ 'user.userId': req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Order.countDocuments({ 'user.userId': req.user.id });
    
    res.json({
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    // Check if order exists
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Check if the order belongs to the user
    if (order.user.userId !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/orders
// @desc    Create a new order
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('items', 'At least one item is required').isArray({ min: 1 }),
      check('items.*.recipe.recipeId', 'Recipe ID is required').not().isEmpty(),
      check('items.*.recipe.name', 'Recipe name is required').not().isEmpty(),
      check('items.*.price', 'Item price is required').isNumeric(),
      check('items.*.quantity', 'Item quantity is required').isNumeric(),
      check('shop.shopId', 'Shop ID is required').not().isEmpty(),
      check('shop.name', 'Shop name is required').not().isEmpty(),
      check('shop.address', 'Shop address is required').not().isEmpty(),
      check('subtotal', 'Subtotal is required').isNumeric(),
      check('total', 'Total amount is required').isNumeric(),
      check('paymentMethod', 'Payment method is required').isIn(['credit_card', 'wechat_pay', 'alipay', 'cash']),
      check('deliveryType', 'Delivery type is required').isIn(['pickup', 'delivery'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      // Create new order
      const newOrder = new Order({
        ...req.body,
        user: {
          userId: req.user.id,
          name: req.body.user.name,
          phone: req.body.user.phone
        },
        orderStatus: 'created',
        statusHistory: [
          {
            status: 'created',
            timestamp: new Date(),
            note: 'Order created'
          }
        ]
      });
      
      const order = await newOrder.save();
      
      // Create payment record for the order
      const newPayment = new Payment({
        order: order._id,
        userId: req.user.id,
        amount: order.total,
        paymentMethod: order.paymentMethod,
        status: 'pending',
        gateway: req.body.paymentMethod === 'wechat_pay' ? 'wechat' : 
                req.body.paymentMethod === 'alipay' ? 'alipay' : 
                req.body.paymentMethod === 'credit_card' ? 'stripe' : 'manual'
      });
      
      await newPayment.save();
      
      res.json({
        order,
        payment: {
          id: newPayment._id,
          status: newPayment.status,
          // Here you would typically add a payment URL or QR code
          // from your payment gateway integration
          paymentUrl: newPayment.paymentUrl || null,
          paymentQrCode: newPayment.paymentQrCode || null
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/orders/:id/cancel
// @desc    Cancel an order
// @access  Private
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    // Check if order exists
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Check if the order belongs to the user
    if (order.user.userId !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Check if order can be cancelled
    const cancellableStatuses = ['created', 'confirmed'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({ 
        msg: 'Order cannot be cancelled',
        currentStatus: order.orderStatus
      });
    }
    
    // Update order status to cancelled
    order.orderStatus = 'cancelled';
    await order.save();
    
    // Update associated payment
    const payment = await Payment.findOne({ order: order._id });
    if (payment && payment.status === 'pending') {
      payment.status = 'failed';
      await payment.save();
    }
    
    res.json({ 
      success: true,
      order
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/orders/status/:status
// @desc    Get orders by status
// @access  Private
router.get('/status/:status', auth, async (req, res) => {
  try {
    const validStatuses = ['created', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(req.params.status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get orders by status for the user with pagination
    const orders = await Order.find({ 
      'user.userId': req.user.id,
      orderStatus: req.params.status
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Order.countDocuments({ 
      'user.userId': req.user.id,
      orderStatus: req.params.status
    });
    
    res.json({
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/orders/shop/:shopId
// @desc    Get orders by shop (for shop admins)
// @access  Private (TODO: Add admin-only middleware)
router.get('/shop/:shopId', auth, async (req, res) => {
  try {
    // TODO: Add check to verify user is a shop admin
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const status = req.query.status;
    const query = { 'shop.shopId': req.params.shopId };
    
    // Add status filter if provided
    if (status) {
      const validStatuses = ['created', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ msg: 'Invalid status' });
      }
      query.orderStatus = status;
    }
    
    // Get orders for the shop with pagination
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Order.countDocuments(query);
    
    res.json({
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/orders/:id/status
// @desc    Update order status (for shop admins)
// @access  Private (TODO: Add admin-only middleware)
router.put('/:id/status', 
  [
    auth,
    [
      check('status', 'Status is required').not().isEmpty(),
      check('status', 'Invalid status').isIn([
        'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed'
      ]),
      check('note', 'Note is optional').optional()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      // TODO: Add check to verify user is a shop admin
      
      const order = await Order.findById(req.params.id);
      
      // Check if order exists
      if (!order) {
        return res.status(404).json({ msg: 'Order not found' });
      }
      
      // Update order status
      order.orderStatus = req.body.status;
      
      const updatedOrder = await order.save();
      
      res.json(updatedOrder);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Order not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router; 