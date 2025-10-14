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

// Indexes for performance
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ rider: 1, status: 1 });

// Pre-save hook to calculate totalAmount
orderSchema.pre('save', function(next) {
  console.log('📝 ORDER PRE-SAVE HOOK RUNNING');
  console.log('  Items count:', this.items?.length || 0);
  console.log('  Delivery fee:', this.deliveryFee);
  
  if (this.items && this.items.length > 0) {
    const itemsTotal = this.items.reduce((sum, item) => {
      console.log(`    Item: ${item.name}, Qty: ${item.qty}, Price: ${item.price}`);
      return sum + (item.price * item.qty);
    }, 0);
    
    this.totalAmount = itemsTotal + this.deliveryFee;
    
    console.log(`  Items total: $${itemsTotal}`);
    console.log(`  ✅ FINAL totalAmount SET TO: $${this.totalAmount}`);
  } else {
    console.log('  ⚠️ NO ITEMS FOUND');
  }
  
  next();
});

// Post-save logging
orderSchema.post('save', function(doc) {
  console.log('✅ ORDER SAVED:');
  console.log('  ID:', doc._id);
  console.log('  totalAmount:', doc.totalAmount);
  console.log('  Type:', typeof doc.totalAmount);
});

// Ensure totalAmount is included in JSON/Object conversions
orderSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Force include totalAmount
    ret.totalAmount = doc.totalAmount;
    
    if (!ret.status && doc.status) {
      ret.status = doc.status;
    }
    
    console.log('📤 CONVERTING TO JSON - totalAmount:', ret.totalAmount);
    
    return ret;
  }
});

orderSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    // Force include totalAmount
    ret.totalAmount = doc.totalAmount;
    
    if (!ret.status && doc.status) {
      ret.status = doc.status;
    }
    
    return ret;
  }
});

module.exports = mongoose.model('Order', orderSchema);