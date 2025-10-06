const Notification = require('../models/Notification');
const { emitToUser } = require('../config/websocket');
const { publishEvent, TOPICS } = require('../config/kafka');

const createNotification = async (userId, notificationData) => {
  try {
    const { type, title, message, data = {}, priority = 'medium' } = notificationData;

    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
      priority
    });

    // Send real-time notification via WebSocket
    emitToUser(userId.toString(), 'new-notification', {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      priority: notification.priority,
      createdAt: notification.createdAt
    });

    // Publish to Kafka
    await publishEvent(TOPICS.NOTIFICATION_CREATED, {
      notificationId: notification._id.toString(),
      userId: userId.toString(),
      type,
      title,
      message,
      priority
    });

    console.log(`📬 Notification created for user ${userId}`);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

const createBulkNotifications = async (userIds, notificationData) => {
  try {
    const notifications = userIds.map(userId => ({
      user: userId,
      ...notificationData
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    // Send real-time notifications
    createdNotifications.forEach(notification => {
      emitToUser(notification.user.toString(), 'new-notification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        createdAt: notification.createdAt
      });
    });

    console.log(`📬 ${createdNotifications.length} bulk notifications created`);
    return createdNotifications;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};

const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

const markAllAsRead = async (userId) => {
  try {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    emitToUser(userId.toString(), 'all-notifications-read', {
      timestamp: new Date()
    });

    console.log(`📬 All notifications marked as read for user ${userId}`);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

const deleteNotification = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.deleteOne();
    console.log(`🗑️ Notification ${notificationId} deleted`);
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      user: userId,
      isRead: false
    });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  createBulkNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
};