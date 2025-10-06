const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide item name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide description'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Please provide price'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Please provide category'],
    enum: ['Burgers', 'Pizza', 'Appetizers', 'Salads', 'Japanese', 'Mexican', 'Desserts', 'Beverages', 'Other']
  },
  restaurant: {
    type: String,
    required: [true, 'Please provide restaurant name'],
    trim: true
  },
  image: {
    type: String,
    default: '🍔'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  preparationTime: {
    type: Number,
    default: 15
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalOrders: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

menuItemSchema.index({ category: 1, isAvailable: 1 });
menuItemSchema.index({ restaurant: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('MenuItem', menuItemSchema);