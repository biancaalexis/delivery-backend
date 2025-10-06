const NOTIFICATION_TYPES = {
  ORDER_CREATED: 'order_created',
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_PICKED_UP: 'order_picked_up',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  NEW_ORDER_AVAILABLE: 'new_order_available',
  MENU_ITEM_ADDED: 'menu_item_added',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  PAYMENT_RECEIVED: 'payment_received',
  RATING_REMINDER: 'rating_reminder',
  PROMOTIONAL_OFFER: 'promotional_offer'
};

const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const USER_ROLES = {
  CUSTOMER: 'customer',
  RIDER: 'rider',
  ADMIN: 'admin'
};

const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

module.exports = {
  NOTIFICATION_TYPES,
  ORDER_STATUS,
  USER_ROLES,
  PRIORITY_LEVELS
};