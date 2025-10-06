const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    name: {
      type: String,
      required: true
    },
    qty: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    }
  }],
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
  status: {
    type: String,
    enum: ['pending', 'accepted', 'picked_up', 'delivered', 'cancelled'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  deliveryFee: {
    type: Number,
    default: 5
  },
  notes: {
    type: String,
    default: ''
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  pickedUpAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  },
  estimatedDeliveryTime: {
    type: Number,
    default: 30
  }
}, {
  timestamps: true
});

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ rider: 1, status: 1 });

orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((sum, item) => {
      return sum + (item.price * item.qty);
    }, 0) + this.deliveryFee;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);