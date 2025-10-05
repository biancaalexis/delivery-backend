const mongoose = require('mongoose');

/**
 * Order Schema
 * Represents delivery orders in the system
 */
const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to User model
    required: true
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to User model (rider)
    default: null
  },
  pickup: {
    address: {
      type: String,
      required: [true, 'Please provide pickup address']
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  dropoff: {
    address: {
      type: String,
      required: [true, 'Please provide dropoff address']
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  item: {
    category: {
      type: String,
      required: [true, 'Please provide item category'],
      enum: ['Food', 'Electronics', 'Documents', 'Clothing', 'Other']
    },
    description: {
      type: String,
      default: ''
    }
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'picked_up', 'delivered', 'cancelled'],
    default: 'pending'
  },
  fare: {
    type: Number,
    default: 0
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

/**
 * Index for efficient querying
 * - Find pending orders for riders
 * - Find customer's orders
 */
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ rider: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);