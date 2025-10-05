require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); // ADD THIS LINE
const { connectProducer, connectConsumer, disconnectKafka } = require('./config/kafka');
const { startKafkaConsumer } = require('./services/kafkaConsumer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Connect to Kafka
connectProducer();
connectConsumer().then(() => {
  startKafkaConsumer();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Delivery App API is running' });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await disconnectKafka();
  server.close(() => {
    process.exit(0);
  });
});