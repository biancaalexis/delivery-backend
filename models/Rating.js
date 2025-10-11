const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  foodRating: {
    type: Number,
    min: 1,
    max: 5,
    default: function() {
      return this.rating;
    }
  },
  deliveryRating: {
    type: Number,
    min: 1,
    max: 5,
    default: function() {
      return this.rating;
    }
  },
  comment: {
    type: String,
    trim: true,
    default: ''
  },
  tags: [{
    type: String,
    enum: ['fast', 'friendly', 'professional', 'careful', 'polite', 'late', 'cold_food', 'wrong_order']
  }],
  response: {
    type: String,
    default: null
  },
  respondedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

ratingSchema.index({ rider: 1, createdAt: -1 });
ratingSchema.index({ customer: 1 });
ratingSchema.index({ order: 1 });
ratingSchema.index({ rating: 1 });

module.exports = mongoose.model('Rating', ratingSchema);