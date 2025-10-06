const express = require('express');
const Rating = require('../models/Rating');
const Order = require('../models/Order');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { publishEvent, TOPICS } = require('../config/kafka');

const router = express.Router();

// POST /api/ratings - Submit rating for order
router.post('/', authenticate, authorize('customer'), async (req, res) => {
  try {
    const { orderId, rating, foodRating, deliveryRating, comment, tags } = req.body;

    if (!orderId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Please provide order ID and rating'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this order'
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate delivered orders'
      });
    }

    const existingRating = await Rating.findOne({ order: orderId });
    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'Order already rated'
      });
    }

    const newRating = await Rating.create({
      order: orderId,
      customer: req.user._id,
      rider: order.rider,
      rating,
      foodRating: foodRating || rating,
      deliveryRating: deliveryRating || rating,
      comment: comment || '',
      tags: tags || []
    });

    // Update rider's average rating
    const riderRatings = await Rating.find({ rider: order.rider });
    const avgRating = riderRatings.reduce((sum, r) => sum + r.rating, 0) / riderRatings.length;
    
    await User.findByIdAndUpdate(order.rider, {
      rating: parseFloat(avgRating.toFixed(2))
    });

    // Kafka event
    await publishEvent(TOPICS.ORDER_RATING_SUBMITTED, {
      ratingId: newRating._id.toString(),
      orderId: orderId,
      riderId: order.rider.toString(),
      customerId: req.user._id.toString(),
      rating,
      foodRating: newRating.foodRating,
      deliveryRating: newRating.deliveryRating
    });

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      data: { rating: newRating }
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting rating',
      error: error.message
    });
  }
});

// GET /api/ratings/rider/:riderId - Get rider ratings
router.get('/rider/:riderId', async (req, res) => {
  try {
    const ratings = await Rating.find({ rider: req.params.riderId })
      .populate('customer', 'name')
      .populate('order', 'createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    res.status(200).json({
      success: true,
      count: ratings.length,
      averageRating: parseFloat(avgRating.toFixed(2)),
      data: { ratings }
    });
  } catch (error) {
    console.error('Get rider ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ratings',
      error: error.message
    });
  }
});

module.exports = router;