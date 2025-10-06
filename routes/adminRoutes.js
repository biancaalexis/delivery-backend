const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/stats - Get dashboard statistics
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const activeOrders = await Order.countDocuments({ 
      status: { $in: ['pending', 'accepted', 'picked_up'] } 
    });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    
    const deliveredOrdersData = await Order.find({ status: 'delivered' });
    const totalRevenue = deliveredOrdersData.reduce((sum, order) => sum + order.totalAmount, 0);
    
    const activeRiders = await Order.distinct('rider', { 
      status: { $in: ['accepted', 'picked_up'] } 
    });

    const totalMenuItems = await MenuItem.countDocuments({ isAvailable: true });
    
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalRiders = await User.countDocuments({ role: 'rider' });

    // Recent orders for quick view
    const recentOrders = await Order.find()
      .populate('customer', 'name phone')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalOrders,
          activeOrders,
          deliveredOrders,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          activeRiders: activeRiders.length,
          totalMenuItems,
          totalCustomers,
          totalRiders
        },
        recentOrders
      }
    });
  } catch (error) {
    console.error('Admin get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// GET /api/admin/orders - Get all orders
router.get('/orders', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('customer', 'name email phone')
      .populate('rider', 'name email phone')
      .populate('items.menuItem', 'restaurant')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalOrders = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total: totalOrders,
      page: parseInt(page),
      pages: Math.ceil(totalOrders / parseInt(limit)),
      data: { orders }
    });
  } catch (error) {
    console.error('Admin get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
});

// GET /api/admin/users - Get all users
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.query;
    
    const query = {};
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: { users }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// PUT /api/admin/users/:id/status - Toggle user active status
router.put('/users/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });
  } catch (error) {
    console.error('Admin update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: error.message
    });
  }
});

// GET /api/admin/analytics - Get analytics data
router.get('/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    let dateFrom;
    const dateTo = new Date();
    
    switch(period) {
      case 'today':
        dateFrom = new Date();
        dateFrom.setHours(0, 0, 0, 0);
        break;
      case 'week':
        dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case 'month':
        dateFrom = new Date();
        dateFrom.setMonth(dateFrom.getMonth() - 1);
        break;
      default:
        dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 7);
    }

    const orders = await Order.find({
      createdAt: { $gte: dateFrom, $lte: dateTo }
    });

    const ordersByStatus = await Order.aggregate([
      { $match: { createdAt: { $gte: dateFrom, $lte: dateTo } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const revenueByDay = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: dateFrom, $lte: dateTo },
          status: 'delivered'
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const topMenuItems = await Order.aggregate([
      { $match: { createdAt: { $gte: dateFrom, $lte: dateTo } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalOrdered: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }
        }
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        totalOrders: orders.length,
        ordersByStatus,
        revenueByDay,
        topMenuItems
      }
    });
  } catch (error) {
    console.error('Admin get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
});

module.exports = router;