const { consumer, TOPICS } = require('../config/kafka');
const Notification = require('../models/Notification');
const { emitToUser, emitToRole, broadcastToAll } = require('../config/websocket');

const startKafkaConsumer = async () => {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const eventData = JSON.parse(message.value.toString());
          
          console.log(`📥 [Kafka] Received event from ${topic}`);
          console.log(`   Key: ${message.key.toString()}`);
          console.log(`   Partition: ${partition}`);

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

            case TOPICS.NOTIFICATION_CREATED:
              await handleNotificationCreated(eventData);
              break;

            case TOPICS.SMS_REQUESTED:
            case TOPICS.EMAIL_REQUESTED:
            case TOPICS.PUSH_NOTIFICATION_REQUESTED:
              // Just log these for now
              console.log(`   Communication event logged: ${topic}`);
              break;
            
            default:
              console.log(`⚠️  Unknown topic: ${topic}`);
          }
        } catch (parseError) {
          console.error('Error parsing Kafka message:', parseError);
        }
      }
    });
    
    console.log('🎧 Kafka consumer is listening for events...');
  } catch (error) {
    console.error('❌ Error starting Kafka consumer:', error.message);
  }
};

const handleOrderCreated = async (eventData) => {
  try {
    console.log('🆕 [Order Created]');
    console.log(`   Order ID: ${eventData.orderId}`);
    console.log(`   Customer: ${eventData.customerName}`);
    console.log(`   Items: ${eventData.items.map(i => `${i.qty}x ${i.name}`).join(', ')}`);
    console.log(`   Total: $${eventData.totalAmount}`);
    
    // Broadcast to admin dashboard
    emitToRole('admin', 'new-order-created', {
      orderId: eventData.orderId,
      customerName: eventData.customerName,
      totalAmount: eventData.totalAmount,
      itemCount: eventData.items.length,
      timestamp: eventData.timestamp
    });
    
    console.log('✅ Order created event processed');
  } catch (error) {
    console.error('❌ Error handling order-created event:', error);
  }
};

const handleOrderAccepted = async (eventData) => {
  try {
    console.log('✋ [Order Accepted]');
    console.log(`   Order ID: ${eventData.orderId}`);
    console.log(`   Rider: ${eventData.riderName}`);
    console.log(`   Customer: ${eventData.customerName}`);
    
    // Update admin dashboard
    emitToRole('admin', 'order-accepted', {
      orderId: eventData.orderId,
      riderName: eventData.riderName,
      timestamp: eventData.timestamp
    });
    
    console.log('✅ Order accepted event processed');
  } catch (error) {
    console.error('❌ Error handling order-accepted event:', error);
  }
};

const handleOrderPickedUp = async (eventData) => {
  try {
    console.log('📦 [Order Picked Up]');
    console.log(`   Order ID: ${eventData.orderId}`);
    console.log(`   Rider: ${eventData.riderName}`);
    
    // Update tracking systems
    emitToRole('admin', 'order-picked-up', {
      orderId: eventData.orderId,
      riderName: eventData.riderName,
      timestamp: eventData.timestamp
    });
    
    console.log('✅ Order picked up event processed');
  } catch (error) {
    console.error('❌ Error handling order-picked-up event:', error);
  }
};

const handleOrderDelivered = async (eventData) => {
  try {
    console.log('🎉 [Order Delivered]');
    console.log(`   Order ID: ${eventData.orderId}`);
    console.log(`   Delivery time: ${eventData.deliveryTime} minutes`);
    console.log(`   Total: $${eventData.totalAmount}`);
    console.log(`   Rider earnings: $${eventData.earnings}`);
    
    // Update analytics and dashboards
    emitToRole('admin', 'order-delivered', {
      orderId: eventData.orderId,
      deliveryTime: eventData.deliveryTime,
      totalAmount: eventData.totalAmount,
      earnings: eventData.earnings,
      timestamp: eventData.timestamp
    });
    
    // Could trigger:
    // - Payment processing
    // - Rating request to customer
    // - Rider earnings update
    // - Analytics update
    
    console.log('✅ Order delivered event processed');
  } catch (error) {
    console.error('❌ Error handling order-delivered event:', error);
  }
};

const handleOrderCancelled = async (eventData) => {
  try {
    console.log('❌ [Order Cancelled]');
    console.log(`   Order ID: ${eventData.orderId}`);
    console.log(`   Reason: ${eventData.reason}`);
    
    // Update dashboards
    emitToRole('admin', 'order-cancelled', {
      orderId: eventData.orderId,
      reason: eventData.reason,
      timestamp: eventData.timestamp
    });
    
    console.log('✅ Order cancelled event processed');
  } catch (error) {
    console.error('❌ Error handling order-cancelled event:', error);
  }
};

const handleMenuItemCreated = async (eventData) => {
  try {
    console.log('🍔 [Menu Item Created]');
    console.log(`   Item: ${eventData.name}`);
    console.log(`   Restaurant: ${eventData.restaurant}`);
    console.log(`   Price: $${eventData.price}`);
    
    // Broadcast to all customers
    emitToRole('customer', 'new-menu-item', {
      menuItemId: eventData.menuItemId,
      name: eventData.name,
      category: eventData.category,
      restaurant: eventData.restaurant
    });
    
    console.log('✅ Menu item created event processed');
  } catch (error) {
    console.error('❌ Error handling menu-item-created event:', error);
  }
};

const handleMenuItemUpdated = async (eventData) => {
  try {
    console.log('✏️ [Menu Item Updated]');
    console.log(`   Item: ${eventData.name}`);
    console.log(`   Available: ${eventData.isAvailable}`);
    
    // Notify if item becomes unavailable
    if (!eventData.isAvailable) {
      broadcastToAll('menu-item-unavailable', {
        menuItemId: eventData.menuItemId,
        name: eventData.name
      });
    }
    
    console.log('✅ Menu item updated event processed');
  } catch (error) {
    console.error('❌ Error handling menu-item-updated event:', error);
  }
};

const handleMenuItemDeleted = async (eventData) => {
  try {
    console.log('🗑️ [Menu Item Deleted]');
    console.log(`   Item: ${eventData.name}`);
    console.log(`   Restaurant: ${eventData.restaurant}`);
    
    // Notify all connected clients
    broadcastToAll('menu-item-deleted', {
      menuItemId: eventData.menuItemId,
      name: eventData.name
    });
    
    console.log('✅ Menu item deleted event processed');
  } catch (error) {
    console.error('❌ Error handling menu-item-deleted event:', error);
  }
};

const handleUserRegistered = async (eventData) => {
  try {
    console.log('👤 [New User Registered]');
    console.log(`   Name: ${eventData.name}`);
    console.log(`   Role: ${eventData.role}`);
    
    // Update admin dashboard stats
    emitToRole('admin', 'new-user-registered', {
      userName: eventData.name,
      userRole: eventData.role,
      userId: eventData.userId
    });
    
    console.log('✅ User registered event processed');
  } catch (error) {
    console.error('❌ Error handling user-registered event:', error);
  }
};

const handleNotificationCreated = async (eventData) => {
  try {
    console.log('🔔 [Notification Created]');
    console.log(`   User: ${eventData.userId}`);
    console.log(`   Type: ${eventData.type}`);
    console.log(`   Title: ${eventData.title}`);
    
    // Already sent via WebSocket in notificationService
    // This is just for logging/analytics
    
    console.log('✅ Notification created event processed');
  } catch (error) {
    console.error('❌ Error handling notification-created event:', error);
  }
};

module.exports = {
  startKafkaConsumer
};