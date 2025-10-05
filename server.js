const express = require('express');
const { Kafka } = require('kafkajs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Kafka
const kafka = new Kafka({
  clientId: 'delivery-backend',
  brokers: ['localhost:9092'], // adjust if your Kafka broker is elsewhere
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'delivery-group' });

(async () => {
  await producer.connect();
  await consumer.connect();
  
  await consumer.subscribe({ topic: 'driver-assignments', fromBeginning: true });

  consumer.run({
    eachMessage: async ({ topic, message }) => {
      console.log(`📩 [${topic}] ${message.value.toString()}`);
    },
  });
})();

// API endpoint to create an order
app.post('/order', async (req, res) => {
  const order = req.body;
  await producer.send({
    topic: 'orders',
    messages: [{ value: JSON.stringify(order) }],
  });
  res.send('✅ Order sent to Kafka!');
});

app.listen(4000, () => console.log('Backend running on http://localhost:4000'));
