const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'fastbite-delivery-app',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ 
  groupId: 'fastbite-app-group' 
});

const TOPICS = {
  ORDER_CREATED: 'order-created',
  ORDER_ACCEPTED: 'order-accepted',
  ORDER_PICKED_UP: 'order-picked-up',
  ORDER_DELIVERED: 'order-delivered',
  ORDER_CANCELLED: 'order-cancelled',
  MENU_ITEM_CREATED: 'menu-item-created',
  MENU_ITEM_UPDATED: 'menu-item-updated',
  MENU_ITEM_DELETED: 'menu-item-deleted',
  NOTIFICATION_SENT: 'notification-sent',
  USER_REGISTERED: 'user-registered'
};

const connectProducer = async () => {
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected');
  } catch (error) {
    console.error('❌ Kafka Producer connection error:', error.message);
    console.log('⚠️  App will continue without Kafka');
  }
};

const connectConsumer = async () => {
  try {
    await consumer.connect();
    console.log('✅ Kafka Consumer connected');
    
    // Subscribe to all topics
    await consumer.subscribe({ 
      topics: Object.values(TOPICS),
      fromBeginning: false
    });
    
    console.log('📫 Subscribed to Kafka topics:', Object.values(TOPICS).join(', '));
  } catch (error) {
    console.error('❌ Kafka Consumer connection error:', error.message);
    console.log('⚠️  App will continue without Kafka consumer');
  }
};

const disconnectKafka = async () => {
  try {
    await producer.disconnect();
    await consumer.disconnect();
    console.log('👋 Kafka disconnected');
  } catch (error) {
    console.error('Error disconnecting Kafka:', error);
  }
};

const publishEvent = async (topic, message) => {
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: message.orderId || message.menuItemId || message.userId || message.id || Date.now().toString(),
          value: JSON.stringify({
            ...message,
            timestamp: new Date().toISOString()
          }),
          headers: {
            'event-type': topic,
            'source': 'fastbite-api',
            'version': '1.0'
          }
        }
      ]
    });
    console.log(`📤 Event published to ${topic}:`, message.orderId || message.menuItemId || message.id);
  } catch (error) {
    console.error(`❌ Error publishing to ${topic}:`, error.message);
    // Don't throw error - let app continue even if Kafka fails
  }
};

module.exports = {
  kafka,
  producer,
  consumer,
  connectProducer,
  connectConsumer,
  disconnectKafka,
  publishEvent,
  TOPICS
};