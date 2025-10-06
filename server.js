require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const { connectProducer, connectConsumer, disconnectKafka } = require('./config/kafka');
const { startKafkaConsumer } = require('./services/kafkaConsumer');
const { initializeWebSocket } = require('./config/websocket');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Connect to MongoDB
connectDB();

// Initialize WebSocket
initializeWebSocket(server);

// Connect to Kafka
connectProducer();
connectConsumer().then(() => {
  startKafkaConsumer();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/ratings', require('./routes/ratingRoutes'));
app.use('/api/riders', require('./routes/riderRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'FastBite API is running',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'FastBite API v2.0',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login'
      },
      menu: {
        getAll: 'GET /api/menu',
        getCategories: 'GET /api/menu/categories',
        getById: 'GET /api/menu/:id',
        create: 'POST /api/menu (admin)',
        update: 'PUT /api/menu/:id (admin)',
        delete: 'DELETE /api/menu/:id (admin)'
      },
      orders: {
        create: 'POST /api/orders (customer)',
        getAll: 'GET /api/orders',
        getById: 'GET /api/orders/:id',
        accept: 'POST /api/orders/:id/accept (rider)',
        pickup: 'POST /api/orders/:id/pickup (rider)',
        deliver: 'POST /api/orders/:id/deliver (rider)',
        cancel: 'POST /api/orders/:id/cancel'
      },
      notifications: {
        getAll: 'GET /api/notifications',
        markRead: 'PUT /api/notifications/:id/read',
        markAllRead: 'PUT /api/notifications/read-all',
        delete: 'DELETE /api/notifications/:id'
      },
      ratings: {
        submit: 'POST /api/ratings',
        getRiderRatings: 'GET /api/ratings/rider/:riderId'
      },
      riders: {
        toggleAvailability: 'PUT /api/riders/availability (rider)',
        updateLocation: 'POST /api/riders/location (rider)',
        getStats: 'GET /api/riders/stats (rider)',
        getAll: 'GET /api/riders (admin)'
      },
      admin: {
        stats: 'GET /api/admin/stats',
        orders: 'GET /api/admin/orders',
        users: 'GET /api/admin/users',
        analytics: 'GET /api/admin/analytics',
        toggleUserStatus: 'PUT /api/admin/users/:id/status',
        sendAnnouncement: 'POST /api/admin/announcement'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`FastBite Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API URL: http://localhost:${PORT}`);
  console.log(`WebSocket enabled on port ${PORT}`);
  console.log('='.repeat(50));
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    await disconnectKafka();
    console.log('Kafka disconnected');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;