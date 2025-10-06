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
  // Order events
  ORDER_CREATED: 'order-created',
  ORDER_ACCEPTED: 'order-accepted',
  ORDER_PICKED_UP: 'order-picked-up',
  ORDER_DELIVERED: 'order-delivered',
  ORDER_CANCELLED: 'order-cancelled',
  
  // Menu events
  MENU_ITEM_CREATED: 'menu-item-created',
  MENU_ITEM_UPDATED: 'menu-item-updated',
  MENU_ITEM_DELETED: 'menu-item-deleted',
  
  // Notification events
  NOTIFICATION_CREATED: 'notification-created',
  NOTIFICATION_SENT: 'notification-sent',
  
  // User events
  USER_REGISTERED: 'user-registered',
  
  // Communication events
  SMS_REQUESTED: 'sms-requested',
  EMAIL_REQUESTED: 'email-requested',
  PUSH_NOTIFICATION_REQUESTED: 'push-notification-requested',
  
  // Real-time events
  RIDER_LOCATION_UPDATE: 'rider-location-update',
  ORDER_STATUS_CHANGED: 'order-status-changed'
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
    
    await consumer.subscribe({ 
      topics: Object.values(TOPICS),
      fromBeginning: false
    });
    
    console.log('📫 Subscribed to', Object.values(TOPICS).length, 'Kafka topics');
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
            'version': '2.0'
          }
        }
      ]
    });
    console.log(`📤 Event published to ${topic}`);
  } catch (error) {
    console.error(`❌ Error publishing to ${topic}:`, error.message);
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