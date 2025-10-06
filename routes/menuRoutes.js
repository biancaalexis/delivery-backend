const express = require('express');
const MenuItem = require('../models/MenuItem');
const { authenticate, authorize } = require('../middleware/auth');
const { publishEvent, TOPICS } = require('../config/kafka');
const { emitToRole } = require('../config/websocket');
const User = require('../models/User');

const router = express.Router();

// GET /api/menu - Get all menu items
router.get('/', async (req, res) => {
  try {
    const { category, restaurant, search, available } = req.query;
    
    const query = {};
    if (category) query.category = category;
    if (restaurant) query.restaurant = restaurant;
    if (available !== undefined) query.isAvailable = available === 'true';
    if (search) {
      query.$text = { $search: search };
    }
    
    const menuItems = await MenuItem.find(query)
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: { menuItems }
    });
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items',
      error: error.message
    });
  }
});

// GET /api/menu/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await MenuItem.distinct('category');
    
    res.status(200).json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

// GET /api/menu/:id - Get single menu item
router.get('/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { menuItem }
    });
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menu item',
      error: error.message
    });
  }
});

// POST /api/menu - Create menu item (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, price, category, restaurant, image, preparationTime } = req.body;
    
    if (!name || !description || !price || !category || !restaurant) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    const menuItem = await MenuItem.create({
      name,
      description,
      price: parseFloat(price),
      category,
      restaurant,
      image: image || '🍔',
      preparationTime: preparationTime || 15
    });
    
    // Kafka event
    await publishEvent(TOPICS.MENU_ITEM_CREATED, {
      menuItemId: menuItem._id.toString(),
      name: menuItem.name,
      category: menuItem.category,
      restaurant: menuItem.restaurant,
      price: menuItem.price
    });
    
    // WebSocket notification to all customers
    emitToRole('customer', 'new-menu-item', {
      menuItem: {
        id: menuItem._id,
        name: menuItem.name,
        category: menuItem.category,
        restaurant: menuItem.restaurant
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: { menuItem }
    });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating menu item',
      error: error.message
    });
  }
});

// PUT /api/menu/:id - Update menu item (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    const { name, description, price, category, restaurant, image, isAvailable, preparationTime } = req.body;
    
    if (name) menuItem.name = name;
    if (description) menuItem.description = description;
    if (price) menuItem.price = parseFloat(price);
    if (category) menuItem.category = category;
    if (restaurant) menuItem.restaurant = restaurant;
    if (image) menuItem.image = image;
    if (isAvailable !== undefined) menuItem.isAvailable = isAvailable;
    if (preparationTime) menuItem.preparationTime = preparationTime;
    
    await menuItem.save();
    
    // Kafka event
    await publishEvent(TOPICS.MENU_ITEM_UPDATED, {
      menuItemId: menuItem._id.toString(),
      name: menuItem.name,
      isAvailable: menuItem.isAvailable,
      price: menuItem.price
    });
    
    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: { menuItem }
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating menu item',
      error: error.message
    });
  }
});

// DELETE /api/menu/:id - Delete menu item (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    const deletedData = {
      menuItemId: menuItem._id.toString(),
      name: menuItem.name,
      restaurant: menuItem.restaurant
    };
    
    await menuItem.deleteOne();
    
    // Kafka event
    await publishEvent(TOPICS.MENU_ITEM_DELETED, deletedData);
    
    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting menu item',
      error: error.message
    });
  }
});

module.exports = router;