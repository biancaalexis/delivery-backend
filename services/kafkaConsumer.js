const { consumer } = require('../config/kafka');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Start Kafka consumer to listen for events
 * This enables real-time processing and notifications
 */
const startKafkaConsumer = async () => {
  try {
    await consumer.run({
      // Process each message
      eachMessage: async ({ topic, partition, message }) => {
        const eventData = JSON.parse(message.value.toString());
        
        console.log(`📥 Received event from ${topic}:`, eventData.orderId);

        // Route to appropriate handler based on topic
        switch (topic) {
          case 'order-created':
            await handleOrderCreated(eventData);
            break;
          
          case 'order-accepted':
            await handleOrderAccepted(eventData);
            break;
          
          case 'order-delivered':
            await handleOrderDelivered(eventData);
            break;
          
          default:
            console.log(`⚠️  Unknown topic: ${topic}`);
        }
      }
    });
    
    console.log('🎧 Kafka consumer is listening...');
  } catch (error) {
    console.error('❌ Error starting Kafka consumer:', error.message);
  }
};

/**
 * Handle order-created event
 * Actions:
 * - Send notification to nearby riders
 * - Log event for analytics
 * - Update cache/search index
 */
const handleOrderCreated = async (eventData) => {
  try {
    console.log('🆕 Processing new order:', eventData.orderId);
    console.log(`   Customer: ${eventData.customerName}`);
    console.log(`   Route: ${eventData.pickup} → ${eventData.dropoff}`);
    console.log(`   Fare: $${eventData.fare}`);
    
    // TODO: Send push notifications to nearby riders
    // Example:
    // const nearbyRiders = await findNearbyRiders(eventData.pickup);
    // for (const rider of nearbyRiders) {
    //   await sendPushNotification(rider, {
    //     title: 'New Delivery Available!',
    //     body: `${eventData.itemCategory} - $${eventData.fare}`,
    //     data: { orderId: eventData.orderId }
    //   });
    // }
    
    // TODO: Update real-time dashboard (WebSocket)
    // io.emit('new-order', eventData);
    
    // TODO: Log to analytics service
    // await analytics.logOrderCreated({
    //   orderId: eventData.orderId,
    //   fare: eventData.fare,
    //   category: eventData.itemCategory
    // });
    
    console.log('✅ Order created event processed');
  } catch (error) {
    console.error('❌ Error handling order-created event:', error);
  }
};

/**
 * Handle order-accepted event
 * Actions:
 * - Notify customer that rider is assigned
 * - Update rider's active deliveries count
 * - Remove from available orders pool
 */
const handleOrderAccepted = async (eventData) => {
  try {
    console.log('✋ Processing order acceptance:', eventData.orderId);
    console.log(`   Rider: ${eventData.riderName}`);
    console.log(`   Customer: ${eventData.customerName}`);
    
    // TODO: Send notification to customer
    // const customer = await User.findById(eventData.customerId);
    // await sendPushNotification(customer, {
    //   title: 'Rider Assigned!',
    //   body: `${eventData.riderName} is on the way to pick up your order`,
    //   data: { orderId: eventData.orderId }
    // });
    
    // TODO: Send SMS notification
    // await smsService.send(customer.phone, 
    //   `Your delivery has been accepted by ${eventData.riderName}. Track: https://app.com/track/${eventData.orderId}`
    // );
    
    // TODO: Update rider statistics
    // await Rider.findByIdAndUpdate(eventData.riderId, {
    //   $inc: { activeDeliveries: 1, totalAccepted: 1 }
    // });
    
    // TODO: Update real-time map
    // io.to(`order-${eventData.orderId}`).emit('rider-assigned', {
    //   riderName: eventData.riderName,
    //   riderId: eventData.riderId
    // });
    
    console.log('✅ Order accepted event processed');
  } catch (error) {
    console.error('❌ Error handling order-accepted event:', error);
  }
};

/**
 * Handle order-delivered event
 * Actions:
 * - Notify customer of successful delivery
 * - Process payment
 * - Update rider earnings
 * - Request rating/review
 */
const handleOrderDelivered = async (eventData) => {
  try {
    console.log('📦 Processing order delivery:', eventData.orderId);
    console.log(`   Total time: ${eventData.totalDeliveryTime} minutes`);
    console.log(`   Fare: $${eventData.fare}`);
    
    // TODO: Send delivery confirmation to customer
    // const customer = await User.findById(eventData.customerId);
    // await sendPushNotification(customer, {
    //   title: 'Delivered Successfully!',
    //   body: 'Your order has been delivered. Please rate your experience.',
    //   data: { orderId: eventData.orderId, action: 'rate' }
    // });
    
    // TODO: Process payment
    // await paymentService.charge({
    //   customerId: eventData.customerId,
    //   amount: eventData.fare,
    //   orderId: eventData.orderId,
    //   description: `Delivery from ${eventData.pickup} to ${eventData.dropoff}`
    // });
    
    // TODO: Update rider earnings
    // const riderShare = eventData.fare * 0.8; // 80% goes to rider
    // await Rider.findByIdAndUpdate(eventData.riderId, {
    //   $inc: { 
    //     totalEarnings: riderShare,
    //     completedDeliveries: 1,
    //     activeDeliveries: -1
    //   }
    // });
    
    // TODO: Send rating request
    // setTimeout(() => {
    //   sendPushNotification(customer, {
    //     title: 'How was your delivery?',
    //     body: `Rate ${eventData.riderName}`,
    //     data: { orderId: eventData.orderId, action: 'rate' }
    //   });
    // }, 300000); // 5 minutes after delivery
    
    // TODO: Send email receipt
    // await emailService.sendReceipt({
    //   to: customer.email,
    //   orderId: eventData.orderId,
    //   fare: eventData.fare,
    //   deliveryTime: eventData.totalDeliveryTime
    // });
    
    // TODO: Log to analytics
    // await analytics.logOrderCompleted({
    //   orderId: eventData.orderId,
    //   deliveryTime: eventData.totalDeliveryTime,
    //   fare: eventData.fare,
    //   riderId: eventData.riderId
    // });
    
    console.log('✅ Order delivered event processed');
  } catch (error) {
    console.error('❌ Error handling order-delivered event:', error);
  }
};

module.exports = {
  startKafkaConsumer
};
