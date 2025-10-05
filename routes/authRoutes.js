const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { connectProducer, connectConsumer, disconnectKafka } = require('./config/kafka');
const { startKafkaConsumer } = require('./services/kafkaConsumer');

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Connect to Kafka
const initKafka = async () => {
  await connectProducer();
  await connectConsumer();
  await startKafkaConsumer();
};

initKafka();

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

app.get('/', (req, res) => {
  res.json({ 
    message: 'Delivery App API is running',
    services: {
      mongodb: 'Connected',
      kafka: 'Connected'
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await disconnectKafka();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await disconnectKafka();
  process.exit(0);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

