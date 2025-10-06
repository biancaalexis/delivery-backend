const express = require('express');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { authenticate, authorize } = require('../middleware/auth');
const { publishEvent, TOPICS } = require('../config/kafka');
const { emitToUser, emitToRole, emitToOrder } = require('../config/websocket');
const { createNotification } = require('../services/notificationService');
const { sendSMS, sendEmail } = require('../services/communicationService');

const router = express.Router();

// POST /api/orders - Create order
router.post('/', authenticate, authorize('customer'), async (req, res) => {
  try {
    const { items, pickup, dropoff, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide order items'
      });
    }

    if (!pickup || !dropoff) {
      return res.status(400).json({
        success: false,
        message: 'Please provide pickup and dropoff addresses'
      });
    }

    // Verify menu items exist
    const menuItemIds = items.map(item => item.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds }, isAvailable: true });
    
    if (menuItems.length !== items.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more menu items not found or unavailable'
      });
    }

    // Build order items with current prices
    const orderItems = items.map(item => {
      const menuItem = menuItems.find(m => m._id.toString() === item.menuItemId);
      return {
        menuItem: menuItem._id,
        name: menuItem.name,
        qty: item.qty,
        price: menuItem.price
      };
    });

    const order = await Order.create({
      customer: req.user._id,
      items: orderItems,
      pickup: { address: pickup },
      dropoff: { address: dropoff },
      notes: notes || '',
      deliveryFee: 5,
      estimatedDeliveryTime: 30
    });

    await order.populate('customer', 'name email phone');
    await order.populate('items.menuItem', 'name category restaurant');

    // Kafka event
    await publishEvent(TOPICS.ORDER_CREATED, {
      orderId: order._id.toString(),
      customerId: order.customer._id.toString(),
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      items: order.items.map(i => ({
        name: i.name,
        qty: i.qty,
        price: i.price
      })),
      totalAmount: order.totalAmount,
      pickup: order.pickup.address,
      dropoff: order.dropoff.address,
      status: order.status,
      timestamp: new Date().toISOString()
    });

    // Real-time notification to riders
    emitToRole('rider', 'new-order-available', {
      orderId: order._id,
      pickup: order.pickup.address,
      dropoff: order.dropoff.address,
      totalAmount: order.totalAmount,
      estimatedEarnings: order.deliveryFee,
      items: order.items.map(i => ({ name: i.name, qty: i.qty }))
    });

    // Create notification for customer
    await createNotification(req.user._id, {
      type: 'order_created',
      title: 'Order Placed Successfully',
      message: `Your order #${order._id.toString().slice(-6)} has been placed. Looking for a rider...`,
      data: { orderId: order._id },
      priority: 'high'
    });

    // Send confirmation to customer
    await sendEmail(req.user.email, 'Order Confirmation', 
      `Your order #${order._id.toString().slice(-6)} has been placed successfully. Total: $${order.totalAmount.toFixed(2)}`);
    
    await sendSMS(req.user.phone, 
      `FastBite: Order #${order._id.toString().slice(-6)} confirmed! Track your order in the app.`);

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

// GET /api/orders - Get orders
router.get('/', authenticate, async (req, res) => {
  try {
    let orders;
    const { status } = req.query;

    if (req.user.role === 'customer') {
      const query = { customer: req.user._id };
      if (status) query.status = status;

      orders = await Order.find(query)
        .populate('rider', 'name phone rating')
        .populate('items.menuItem', 'name category restaurant')
        .sort({ createdAt: -1 });

    } else if (req.user.role === 'rider') {
      if (status === 'available' || !status) {
        orders = await Order.find({ status: 'pending', rider: null })
          .populate('customer', 'name phone')
          .populate('items.menuItem', 'name category restaurant')
          .sort({ createdAt: -1 });
      } else {
        orders = await Order.find({ rider: req.user._id })
          .populate('customer', 'name phone')
          .populate('items.menuItem', 'name category restaurant')
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

// GET /api/orders/:id - Get order by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('rider', 'name email phone rating vehicleType')
      .populate('items.menuItem', 'name category restaurant');

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

// POST /api/orders/:id/accept - Rider accepts order
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

    await order.populate('customer', 'name phone email');
    await order.populate('rider', 'name phone vehicleType');
    await order.populate('items.menuItem', 'name restaurant');

    // Kafka event
    await publishEvent(TOPICS.ORDER_ACCEPTED, {
      orderId: order._id.toString(),
      customerId: order.customer._id.toString(),
      customerName: order.customer.name,
      riderId: order.rider._id.toString(),
      riderName: order.rider.name,
      riderVehicle: order.rider.vehicleType,
      totalAmount: order.totalAmount,
      timestamp: new Date().toISOString()
    });

    // Notification to customer
    await createNotification(order.customer._id, {
      type: 'order_accepted',
      title: 'Rider Found!',
      message: `${order.rider.name} has accepted your order and is heading to pick it up!`,
      data: { orderId: order._id, riderId: order.rider._id },
      priority: 'high'
    });

    // Real-time updates
    emitToUser(order.customer._id.toString(), 'order-accepted', {
      orderId: order._id,
      riderName: order.rider.name,
      riderPhone: order.rider.phone,
      vehicleType: order.rider.vehicleType
    });

    emitToOrder(order._id.toString(), 'order-status-changed', {
      orderId: order._id,
      status: 'accepted',
      riderName: order.rider.name
    });

    // Broadcast to other riders that order is taken
    emitToRole('rider', 'order-taken', {
      orderId: order._id
    });

    // Send SMS/Email
    await sendSMS(order.customer.phone, 
      `FastBite: ${order.rider.name} accepted your order! ETA: ${order.estimatedDeliveryTime} mins`);
    
    await sendEmail(order.customer.email, 'Order Accepted',
      `Good news! Your order #${order._id.toString().slice(-6)} has been accepted by ${order.rider.name}.`);

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

// POST /api/orders/:id/pickup - Mark order as picked up
router.post('/:id/pickup', authenticate, authorize('rider'), async (req, res) => {
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
        message: 'Not authorized'
      });
    }

    if (order.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Order must be accepted first'
      });
    }

    order.status = 'picked_up';
    order.pickedUpAt = new Date();
    await order.save();

    await order.populate('customer', 'name phone email');
    await order.populate('rider', 'name phone');

    // Kafka event
    await publishEvent(TOPICS.ORDER_PICKED_UP, {
      orderId: order._id.toString(),
      customerId: order.customer._id.toString(),
      riderId: order.rider._id.toString(),
      riderName: order.rider.name,
      timestamp: new Date().toISOString()
    });

    // Notification
    await createNotification(order.customer._id, {
      type: 'order_picked_up',
      title: 'Order Picked Up',
      message: `${order.rider.name} has picked up your order and is on the way!`,
      data: { orderId: order._id },
      priority: 'high'
    });

    // Real-time updates
    emitToUser(order.customer._id.toString(), 'order-picked-up', {
      orderId: order._id,
      riderName: order.rider.name,
      estimatedArrival: order.estimatedDeliveryTime
    });

    emitToOrder(order._id.toString(), 'order-status-changed', {
      orderId: order._id,
      status: 'picked_up'
    });

    // Communications
    await sendSMS(order.customer.phone,
      `FastBite: Your order is on the way! ${order.rider.name} will deliver soon.`);

    res.status(200).json({
      success: true,
      message: 'Order marked as picked up',
      data: { order }
    });
  } catch (error) {
    console.error('Pickup order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking order as picked up',
      error: error.message
    });
  }
});

// POST /api/orders/:id/deliver - Mark order as delivered
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
        message: 'Not authorized'
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order already delivered'
      });
    }

    if (order.status !== 'picked_up') {
      return res.status(400).json({
        success: false,
        message: 'Order must be picked up before delivery'
      });
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();

    await order.populate('customer', 'name phone email');
    await order.populate('rider', 'name phone');

    const deliveryTime = Math.round((order.deliveredAt - order.acceptedAt) / 1000 / 60);

    // Update rider stats
    await req.user.updateOne({
      $inc: { totalDeliveries: 1, earnings: order.deliveryFee }
    });

    // Kafka event
    await publishEvent(TOPICS.ORDER_DELIVERED, {
      orderId: order._id.toString(),
      customerId: order.customer._id.toString(),
      riderId: order.rider._id.toString(),
      riderName: order.rider.name,
      totalAmount: order.totalAmount,
      deliveryTime,
      earnings: order.deliveryFee,
      timestamp: new Date().toISOString()
    });

    // Notification
    await createNotification(order.customer._id, {
      type: 'order_delivered',
      title: 'Order Delivered!',
      message: 'Your order has been delivered! Enjoy your meal!',
      data: { orderId: order._id, deliveryTime },
      priority: 'high'
    });

    // Real-time updates
    emitToUser(order.customer._id.toString(), 'order-delivered', {
      orderId: order._id,
      deliveryTime
    });

    emitToOrder(order._id.toString(), 'order-status-changed', {
      orderId: order._id,
      status: 'delivered'
    });

    // Communications
    await sendSMS(order.customer.phone,
      `FastBite: Order delivered! Thank you for ordering. Please rate your experience.`);
    
    await sendEmail(order.customer.email, 'Order Delivered',
      `Your order #${order._id.toString().slice(-6)} has been delivered successfully! Total: $${order.totalAmount.toFixed(2)}`);

    res.status(200).json({
      success: true,
      message: 'Order marked as delivered',
      data: { order, deliveryTime }
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

// POST /api/orders/:id/cancel - Cancel order
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const isCustomer = order.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel delivered order'
      });
    }

    if (order.status === 'picked_up' && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order that is already picked up. Contact support.'
      });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Customer requested';
    await order.save();

    await order.populate('customer', 'name phone email');
    if (order.rider) {
      await order.populate('rider', 'name phone');
    }

    // Kafka event
    await publishEvent(TOPICS.ORDER_CANCELLED, {
      orderId: order._id.toString(),
      customerId: order.customer._id.toString(),
      riderId: order.rider?._id.toString(),
      reason: order.cancellationReason,
      timestamp: new Date().toISOString()
    });

    // Notify rider if assigned
    if (order.rider) {
      await createNotification(order.rider._id, {
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Order #${order._id.toString().slice(-6)} has been cancelled.`,
        data: { orderId: order._id, reason: order.cancellationReason },
        priority: 'medium'
      });

      emitToUser(order.rider._id.toString(), 'order-cancelled', {
        orderId: order._id,
        reason: order.cancellationReason
      });

      await sendSMS(order.rider.phone,
        `FastBite: Order #${order._id.toString().slice(-6)} has been cancelled.`);
    }

    // Broadcast to riders that order is available again if it was just accepted
    if (order.rider && order.status === 'accepted') {
      emitToRole('rider', 'order-available-again', {
        orderId: order._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message
    });
  }
});

module.exports = router;