const { publishEvent, TOPICS } = require('../config/kafka');

// Mock SMS Service (prints to console - replace with Twilio/AWS SNS in production)
const sendSMS = async (phoneNumber, message) => {
  try {
    console.log('\n📱 ===== SMS MESSAGE =====');
    console.log(`To: ${phoneNumber}`);
    console.log(`Message: ${message}`);
    console.log('========================\n');

    // Publish to Kafka for logging
    await publishEvent(TOPICS.SMS_REQUESTED, {
      phoneNumber,
      message,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });

    return {
      success: true,
      phoneNumber,
      message,
      sentAt: new Date()
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Mock Email Service (prints to console - replace with SendGrid/AWS SES in production)
const sendEmail = async (to, subject, body, html = null) => {
  try {
    console.log('\n📧 ===== EMAIL MESSAGE =====');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    if (html) {
      console.log(`HTML: ${html.substring(0, 100)}...`);
    }
    console.log('===========================\n');

    // Publish to Kafka for logging
    await publishEvent(TOPICS.EMAIL_REQUESTED, {
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });

    return {
      success: true,
      to,
      subject,
      sentAt: new Date()
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Mock Push Notification (prints to console - replace with FCM/APNS in production)
const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    console.log('\n🔔 ===== PUSH NOTIFICATION =====');
    console.log(`User ID: ${userId}`);
    console.log(`Title: ${title}`);
    console.log(`Body: ${body}`);
    console.log(`Data:`, JSON.stringify(data, null, 2));
    console.log('================================\n');

    // Publish to Kafka
    await publishEvent(TOPICS.PUSH_NOTIFICATION_REQUESTED, {
      userId,
      title,
      body,
      data,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });

    return {
      success: true,
      userId,
      title,
      sentAt: new Date()
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Batch SMS
const sendBulkSMS = async (recipients) => {
  try {
    const results = await Promise.all(
      recipients.map(({ phoneNumber, message }) => sendSMS(phoneNumber, message))
    );
    
    const successful = results.filter(r => r.success).length;
    console.log(`📱 Sent ${successful}/${recipients.length} SMS messages`);
    
    return {
      total: recipients.length,
      successful,
      failed: recipients.length - successful,
      results
    };
  } catch (error) {
    console.error('Error sending bulk SMS:', error);
    throw error;
  }
};

// Batch Email
const sendBulkEmail = async (recipients) => {
  try {
    const results = await Promise.all(
      recipients.map(({ to, subject, body, html }) => 
        sendEmail(to, subject, body, html)
      )
    );
    
    const successful = results.filter(r => r.success).length;
    console.log(`📧 Sent ${successful}/${recipients.length} emails`);
    
    return {
      total: recipients.length,
      successful,
      failed: recipients.length - successful,
      results
    };
  } catch (error) {
    console.error('Error sending bulk email:', error);
    throw error;
  }
};

module.exports = {
  sendSMS,
  sendEmail,
  sendPushNotification,
  sendBulkSMS,
  sendBulkEmail
};