const { consumer, TOPICS } = require('../config/kafka');
const Notification = require('../models/Notification');

const startKafkaConsumer = async () => {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const eventData = JSON.parse(message.value.toString());
        
        console.log(`📥 Received event from ${topic}`);

        switch (topic) {
          case TOPICS.ORDER_CREATED:
            await handleOrderCreated(eventData);
            break;
          
          case TOPICS.ORDER_ACCEPTED:
            await handleOrderAccepted(eventData);
            break;

          case TOPICS.ORDER_PICKED_UP:
            await handleOrderPickedUp(eventData);
            break;
          
          case TOPICS.ORDER_DELIVERED:
            await handleOrderDelivered(eventData);
            break;

          case TOPICS.ORDER_CANCELLED:
            await handleOrderCancelled(eventData);
            break;

          case TOPICS.MENU_ITEM_CREATED:
            await handleMenuItemCreated(eventData);
            break;

          case TOPICS.MENU_ITEM_UPDATED:
            await handleMenuItemUpdated(eventData);
            break;

          case TOPICS.MENU_ITEM_DELETED:
            await handleMenuItemDeleted(eventData);
            break;

          case TOPICS.USER_REGISTERED:
            await handleUserRegistered(eventData);
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

const handleOrderCreated = async (eventData) => {
  try {
    console.log('🆕 Order Created:');
    console.log(`   Order ID: ${eventData.orderId}`);
    console.log(`   Customer: ${eventData.customerName}`);
    console.log(`   Items: ${eventData.items.map(i => `${i.qty}x ${i.name}`).join(', ')}`);
    console.log(`   Total: $${eventData.totalAmount}`);
    
    // TODO: Send push notifications to nearby riders
    // TODO: Update real-time dashboard via WebSocket
    // TODO: Send SMS to customer with order confirmation
    
    console.log('✅ Order created event processed');
  } catch (error) {
    console.error('❌ Error handling order-created event:', error);
  }
};

const handleOrderAccepted = async (eventData) => {
  try {
    console.log('✋ Order Accepted:');
    console.log(`   Order ID: ${eventData.orderId}`);
    console.log(`   Rider: ${eventData.riderName}`);
    console.log(`   Customer: ${eventData.customerName}`);
    
    // TODO: Send push notification to customer
    // TODO: Send SMS to customer with rider details
    // TODO: Initialize real-time tracking
    
    console.log('✅ Order accepted event processed');
  } catch (error) {
    console.error('❌ Error handling order-accepted event:', error);
  }
};

const handleOrderPickedUp = async (eventData) => {
  try {
    console.log('📦 Order Picked Up:');
    console.log(`   Order ID: ${eventData.orderId}`);
    console.log(`   Rider: ${eventData.riderName}`);
    
    // TODO: Send notification to customer
    // TODO: Update tracking status
    
    console.log('✅ Order picked up event processed');
  } catch (error) {
    console.error('❌ Error handling order-picked-up event:', error);
  }
};

const handleOrderDelivered = async (eventData) => {
  try {
    console.log('🎉 Order Delivered:');
    console.log(`   Order ID: ${eventData.orderId}`);
    console.log(`   Delivery time: ${eventData.totalDeliveryTime} minutes`);
    console.log(`   Total: $${eventData.totalAmount}`);
    
    // TODO: Send delivery confirmation
    // TODO: Process payment
    // TODO: Update rider earnings
    // TODO: Send rating request
    // TODO: Send email receipt
    
    console.log('✅ Order delivered event processed');
  } catch (error) {
    console.error('❌ Error handling order-delivered event:', error);
  }
};

const handleOrderCancelled = async (eventData) => {
  try {
    console.log('❌ Order Cancelled:');
    console.log(`   Order ID: ${eventData.orderId}`);
    
    // TODO: Send notifications
    // TODO: Process refund if needed
    
    console.log('✅ Order cancelled event processed');
  } catch (error) {
    console.error('❌ Error handling order-cancelled event:', error);
  }
};

const handleMenuItemCreated = async (eventData) => {
  try {
    console.log('🍔 Menu Item Created:');
    console.log(`   Item: ${eventData.name}`);
    console.log(`   Restaurant: ${eventData.restaurant}`);
    console.log(`   Price: $${eventData.price}`);
    
    // TODO: Notify customers about new menu item
    // TODO: Update search indexes
    
    console.log('✅ Menu item created event processed');
  } catch (error) {
    console.error('❌ Error handling menu-item-created event:', error);
  }
};

const handleMenuItemUpdated = async (eventData) => {
  try {
    console.log('✏️ Menu Item Updated:');
    console.log(`   Item: ${eventData.name}`);
    console.log(`   Available: ${eventData.isAvailable}`);
    
    // TODO: Update cache
    // TODO: Notify affected orders
    
    console.log('✅ Menu item updated event processed');
  } catch (error) {
    console.error('❌ Error handling menu-item-updated event:', error);
  }
};

const handleMenuItemDeleted = async (eventData) => {
  try {
    console.log('🗑️ Menu Item Deleted:');
    console.log(`   Item: ${eventData.name}`);
    console.log(`   Restaurant: ${eventData.restaurant}`);
    
    // TODO: Update cache
    // TODO: Handle active orders with this item
    
    console.log('✅ Menu item deleted event processed');
  } catch (error) {
    console.error('❌ Error handling menu-item-deleted event:', error);
  }
};

const handleUserRegistered = async (eventData) => {
  try {
    console.log('👤 New User Registered:');
    console.log(`   Name: ${eventData.name}`);
    console.log(`   Role: ${eventData.role}`);
    
    // TODO: Send welcome email
    // TODO: Create onboarding notifications
    
    console.log('✅ User registered event processed');
  } catch (error) {
    console.error('❌ Error handling user-registered event:', error);
  }
};

module.exports = {
  startKafkaConsumer
};