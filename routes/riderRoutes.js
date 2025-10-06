const express = require('express');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { publishEvent, TOPICS } = require('../config/kafka');
const { emitToUser, emitToRole } = require('../config/websocket');

const router = express.Router();

// PUT /api/riders/availability - Toggle rider availability
router.put('/availability', authenticate, authorize('rider'), async (req, res) => {
  try {
    req.user.isAvailable = !req.user.isAvailable;
    await req.user.save();

    await publishEvent(TOPICS.RIDER_AVAILABILITY_CHANGED, {
      riderId: req.user._id.toString(),
      riderName: req.user.name,
      isAvailable: req.user.isAvailable
    });

    emitToRole('admin', 'rider-availability-changed', {
      riderId: req.user._id,
      riderName: req.user.name,
      isAvailable: req.user.isAvailable
    });

    res.status(200).json({
      success: true,
      message: `You are now ${req.user.isAvailable ? 'available' : 'unavailable'} for deliveries`,
      data: { isAvailable: req.user.isAvailable }
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating availability',
      error: error.message
    });
  }
});

// POST /api/riders/location - Update rider location
router.post('/location', authenticate, authorize('rider'), async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    req.user.currentLocation = {
      lat,
      lng,
      lastUpdated: new Date()
    };
    await req.user.save();

    await publishEvent(TOPICS.RIDER_LOCATION_UPDATE, {
      riderId: req.user._id.toString(),
      riderName: req.user.name,
      location: { lat, lng },
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Location updated'
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
});

// GET /api/riders/stats - Get rider statistics
router.get('/stats', authenticate, authorize('rider'), async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    const totalDeliveries = await Order.countDocuments({
      rider: req.user._id,
      status: 'delivered'
    });

    const totalEarnings = await Order.aggregate([
      {
        $match: {
          rider: req.user._id,
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$deliveryFee' }
        }
      }
    ]);

    const earnings = totalEarnings.length > 0 ? totalEarnings[0].total : 0;

    const todayDeliveries = await Order.countDocuments({
      rider: req.user._id,
      status: 'delivered',
      deliveredAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalDeliveries,
        totalEarnings: earnings,
        todayDeliveries,
        rating: req.user.rating,
        isAvailable: req.user.isAvailable
      }
    });
  } catch (error) {
    console.error('Get rider stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// GET /api/riders - Get all riders (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { available } = req.query;
    
    const query = { role: 'rider' };
    if (available !== undefined) {
      query.isAvailable = available === 'true';
    }

    const riders = await User.find(query)
      .select('-password')
      .sort({ rating: -1 });

    res.status(200).json({
      success: true,
      count: riders.length,
      data: { riders }
    });
  } catch (error) {
    console.error('Get riders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching riders',
      error: error.message
    });
  }
});

module.exports = router;