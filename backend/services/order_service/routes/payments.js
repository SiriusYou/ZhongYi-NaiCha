const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');
const Order = require('../models/Order');

// @route   GET api/payments
// @desc    Get all payments for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get payments for the user with pagination
    const payments = await Payment.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Payment.countDocuments({ userId: req.user.id });
    
    res.json({
      payments,
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

// @route   GET api/payments/:id
// @desc    Get payment by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    // Check if payment exists
    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found' });
    }
    
    // Check if the payment belongs to the user
    if (payment.userId !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    res.json(payment);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Payment not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/payments/webhook
// @desc    Handle payment gateway webhooks (e.g., from Wechat Pay, Alipay)
// @access  Public (secured by payment gateway secret)
router.post('/webhook', async (req, res) => {
  // In a real implementation, you would verify the webhook signature
  // using a shared secret or API key from the payment gateway
  
  try {
    const { type, data } = req.body;
    
    // Handle different types of webhook events
    switch (type) {
      case 'payment_success':
        // Find the payment by transaction ID
        const payment = await Payment.findOne({ gatewayTransactionId: data.transaction_id });
        
        if (!payment) {
          return res.status(404).json({ msg: 'Payment not found' });
        }
        
        // Update payment status
        payment.status = 'completed';
        payment.gatewayResponse = data;
        await payment.save();
        
        // Update the associated order
        const order = await Order.findById(payment.order);
        if (order) {
          if (order.orderStatus === 'created') {
            order.orderStatus = 'confirmed';
            order.paymentStatus = 'completed';
            order.paymentDetails = {
              transactionId: data.transaction_id,
              transactionTime: new Date(data.transaction_time),
              gatewayResponse: data
            };
            await order.save();
          }
        }
        
        break;
        
      case 'payment_failed':
        // Handle payment failure webhook
        const failedPayment = await Payment.findOne({ gatewayTransactionId: data.transaction_id });
        
        if (failedPayment) {
          failedPayment.status = 'failed';
          failedPayment.gatewayResponse = data;
          await failedPayment.save();
        }
        
        break;
        
      case 'refund_processed':
        // Handle refund webhook
        const refundedPayment = await Payment.findOne({ gatewayTransactionId: data.transaction_id });
        
        if (refundedPayment) {
          refundedPayment.status = 'refunded';
          refundedPayment.refundInfo = {
            amount: data.refund_amount,
            reason: data.refund_reason,
            refundedAt: new Date(data.refund_time),
            gatewayRefundId: data.refund_id
          };
          refundedPayment.gatewayResponse = data;
          await refundedPayment.save();
          
          // Update associated order if needed
          const refundedOrder = await Order.findById(refundedPayment.order);
          if (refundedOrder && refundedOrder.orderStatus !== 'cancelled') {
            refundedOrder.orderStatus = 'cancelled';
            refundedOrder.paymentStatus = 'refunded';
            await refundedOrder.save();
          }
        }
        
        break;
        
      default:
        // Log unknown webhook event types
        console.log('Unknown webhook event type:', type);
    }
    
    // Acknowledge receipt of webhook
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/payments/confirm/:id
// @desc    Confirm manual payment (e.g., cash on delivery)
// @access  Private (Admin only - TODO: Add admin middleware)
router.post('/confirm/:id', auth, async (req, res) => {
  try {
    // TODO: Add check to verify user is an admin
    
    const payment = await Payment.findById(req.params.id);
    
    // Check if payment exists
    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found' });
    }
    
    // Update payment status
    payment.status = 'completed';
    
    await payment.save();
    
    // Update the associated order
    const order = await Order.findById(payment.order);
    if (order) {
      order.paymentStatus = 'completed';
      
      // If order was just created, move it to confirmed status
      if (order.orderStatus === 'created') {
        order.orderStatus = 'confirmed';
      }
      
      await order.save();
    }
    
    res.json({ success: true, payment });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Payment not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/payments/refund/:id
// @desc    Process a refund
// @access  Private (Admin only - TODO: Add admin middleware)
router.post(
  '/refund/:id',
  [
    auth,
    [
      check('amount', 'Refund amount is required').isNumeric(),
      check('reason', 'Refund reason is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      // TODO: Add check to verify user is an admin
      
      const payment = await Payment.findById(req.params.id);
      
      // Check if payment exists
      if (!payment) {
        return res.status(404).json({ msg: 'Payment not found' });
      }
      
      // Check if payment can be refunded
      if (payment.status !== 'completed') {
        return res.status(400).json({ 
          msg: 'Payment cannot be refunded',
          currentStatus: payment.status
        });
      }
      
      // In a real app, you would call the payment gateway's refund API here
      // For this example, we'll just update the status locally
      
      // Update payment status and refund info
      payment.status = 'refunded';
      payment.refundInfo = {
        amount: req.body.amount,
        reason: req.body.reason,
        refundedAt: new Date()
      };
      
      await payment.save();
      
      // Update associated order if needed
      const order = await Order.findById(payment.order);
      if (order && order.orderStatus !== 'cancelled') {
        order.orderStatus = 'cancelled';
        order.paymentStatus = 'refunded';
        await order.save();
      }
      
      res.json({ success: true, payment });
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Payment not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/payments/order/:orderId
// @desc    Get payment by order ID
// @access  Private
router.get('/order/:orderId', auth, async (req, res) => {
  try {
    const payment = await Payment.findOne({ order: req.params.orderId });
    
    // Check if payment exists
    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found for this order' });
    }
    
    // Check if the payment belongs to the user
    if (payment.userId !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    res.json(payment);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Payment not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 