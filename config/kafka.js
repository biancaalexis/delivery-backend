const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'delivery-app',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ 
  groupId: 'delivery-app-group' 
});

const connectProducer = async () => {
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected');
  } catch (error) {
    console.error('❌ Kafka Producer connection error:', error);
    console.log('⚠️  App will continue without Kafka');
  }
};

const connectConsumer = async () => {
  try {
    await consumer.connect();
    console.log('✅ Kafka Consumer connected');
    
    await consumer.subscribe({ 
      topics: ['order-created', 'order-accepted', 'order-delivered'],
      fromBeginning: false
    });
    
    console.log('📫 Subscribed to Kafka topics');
  } catch (error) {
    console.error('❌ Kafka Consumer connection error:', error);
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
          key: message.orderId || message.id,
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