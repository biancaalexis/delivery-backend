const express = require('express');
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const User = require('../models/User');
const { publishEvent } = require('../config/kafka');

const router = express.Router();

// Middleware: Authenticate user via JWT
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Middleware: Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// POST /api/orders - Create a new delivery order
router.post('/', authenticate, authorize('customer'), async (req, res) => {
  try {
    const { pickup, dropoff, item, description, restaurant, category } = req.body;

    if (!pickup || !dropoff || !item) {
      return res.status(400).json({
        success: false,
        message: 'Please provide pickup, dropoff, and item details'
      });
    }

    // Calculate fare based on distance (simplified)
    const baseFare = 5;
    const perKmRate = 2;
    const estimatedDistance = Math.random() * 10 + 1;
    const fare = baseFare + (estimatedDistance * perKmRate);

    // Create order with detailed item info
    const order = await Order.create({
      customer: req.user._id,
      pickup: {
        address: pickup
      },
      dropoff: {
        address: dropoff
      },
      item: {
        name: item,
        category: category || 'Other',
        restaurant: restaurant || null,
        description: description || ''
      },
      fare: parseFloat(fare.toFixed(2))
    });

    await order.populate('customer', 'name email phone');

    // Kafka: Publish order-created event
    await publishEvent('order-created', {
      orderId: order._id.toString(),
      customerId: order.customer._id.toString(),
      customerName: order.customer.name,
      pickup: order.pickup.address,
      dropoff: order.dropoff.address,
      itemName: order.item.name,
      itemCategory: order.item.category,
      restaurant: order.item.restaurant,
      fare: order.fare,
      status: order.status,
      createdAt: order.createdAt
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
});

// GET /api/orders - Get orders based on user role
router.get('/', authenticate, async (req, res) => {
  try {
    let orders;
    const { status } = req.query;

    if (req.user.role === 'customer') {
      const query = { customer: req.user._id };
      if (status) query.status = status;

      orders = await Order.find(query)
        .populate('rider', 'name phone')
        .sort({ createdAt: -1 });

    } else if (req.user.role === 'rider') {
      if (status === 'available' || !status) {
        orders = await Order.find({ status: 'pending', rider: null })
          .populate('customer', 'name phone')
          .sort({ createdAt: -1 });
      } else {
        orders = await Order.find({ rider: req.user._id })
          .populate('customer', 'name phone')
          .sort({ createdAt: -1 });
      }
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      data: { orders }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
});

// GET /api/orders/:id - Get single order by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('rider', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const isCustomer = order.customer._id.toString() === req.user._id.toString();
    const isRider = order.rider && order.rider._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isRider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
});

// POST /api/orders/:id/accept - Rider accepts an order
router.post('/:id/accept', authenticate, authorize('rider'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Order is no longer available'
      });
    }

    if (order.rider) {
      return res.status(400).json({
        success: false,
        message: 'Order already accepted by another rider'
      });
    }

    order.rider = req.user._id;
    order.status = 'accepted';
    order.acceptedAt = new Date();
    await order.save();

    await order.populate('customer', 'name phone');
    await order.populate('rider', 'name phone');

    // Kafka: Publish order-accepted event
    await publishEvent('order-accepted', {
      orderId: order._id.toString(),
      customerId: order.customer._id.toString(),
      customerName: order.customer.name,
      riderId: order.rider._id.toString(),
      riderName: order.rider.name,
      itemName: order.item.name,
      restaurant: order.item.restaurant,
      pickup: order.pickup.address,
      dropoff: order.dropoff.address,
      fare: order.fare,
      acceptedAt: order.acceptedAt
    });

    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting order',
      error: error.message
    });
  }
});

// POST /api/orders/:id/deliver - Rider marks order as delivered
router.post('/:id/deliver', authenticate, authorize('rider'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to deliver this order'
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order already marked as delivered'
      });
    }

    if (order.status !== 'accepted' && order.status !== 'picked_up') {
      return res.status(400).json({
        success: false,
        message: 'Order must be accepted before delivery'
      });
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();

    await order.populate('customer', 'name phone');
    await order.populate('rider', 'name phone');

    // Kafka: Publish order-delivered event
    await publishEvent('order-delivered', {
      orderId: order._id.toString(),
      customerId: order.customer._id.toString(),
      customerName: order.customer.name,
      riderId: order.rider._id.toString(),
      riderName: order.rider.name,
      itemName: order.item.name,
      restaurant: order.item.restaurant,
      pickup: order.pickup.address,
      dropoff: order.dropoff.address,
      fare: order.fare,
      deliveredAt: order.deliveredAt,
      totalDeliveryTime: Math.round((order.deliveredAt - order.acceptedAt) / 1000 / 60)
    });

    res.status(200).json({
      success: true,
      message: 'Order marked as delivered',
      data: { order }
    });
  } catch (error) {
    console.error('Deliver order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking order as delivered',
      error: error.message
    });
  }
});

module.exports = router;