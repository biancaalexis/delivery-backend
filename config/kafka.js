const { Kafka } = require('kafkajs');

/**
 * Initialize Kafka client
 * Connect to local Kafka broker on localhost:9092
 */
const kafka = new Kafka({
  clientId: 'delivery-app',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

// Create producer instance for sending events
const producer = kafka.producer();

// Create consumer instance for receiving events
const consumer = kafka.consumer({ 
  groupId: 'delivery-app-group' 
});

/**
 * Connect Kafka producer
 * Call this when server starts
 */
const connectProducer = async () => {
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected');
  } catch (error) {
    console.error('❌ Kafka Producer connection error:', error);
    console.log('⚠️  Make sure Kafka is running on localhost:9092');
    console.log('⚠️  App will continue without Kafka');
  }
};

/**
 * Connect Kafka consumer
 * Call this when server starts
 */
const connectConsumer = async () => {
  try {
    await consumer.connect();
    console.log('✅ Kafka Consumer connected');
    
    // Subscribe to topics
    await consumer.subscribe({ 
      topics: ['order-created', 'order-accepted', 'order-delivered'],
      fromBeginning: false // Only consume new messages
    });
    
    console.log('📫 Subscribed to Kafka topics');
  } catch (error) {
    console.error('❌ Kafka Consumer connection error:', error);
    console.log('⚠️  Make sure topics are created:');
    console.log('   bin/kafka-topics.sh --list --bootstrap-server localhost:9092');
    console.log('⚠️  App will continue without Kafka consumer');
  }
};

/**
 * Disconnect Kafka connections gracefully
 * Call this on server shutdown
 */
const disconnectKafka = async () => {
  try {
    await producer.disconnect();
    await consumer.disconnect();
    console.log('👋 Kafka disconnected');
  } catch (error) {
    console.error('Error disconnecting Kafka:', error);
  }
};

/**
 * Publish event to Kafka topic
 * @param {string} topic - Kafka topic name
 * @param {object} message - Event payload
 */
const publishEvent = async (topic, message) => {
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: message.orderId || message.id, // Use orderId as partition key
          value: JSON.stringify({
            ...message,
            timestamp: new Date().toISOString()
          }),
          headers: {
            'event-type': topic,
            'source': 'delivery-app-api'
          }
        }
      ]
    });
    console.log(`📤 Event published to ${topic}:`, message.orderId || message.id);
  } catch (error) {
    console.error(`❌ Error publishing to ${topic}:`, error.message);
    // Don't throw error - allow app to continue even if Kafka fails
  }
};

module.exports = {
  kafka,
  producer,
  consumer,
  connectProducer,
  connectConsumer,
  disconnectKafka,
  publishEvent
};