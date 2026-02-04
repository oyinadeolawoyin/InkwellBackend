/**
 * Notification Service
 * 
 * Handles multi-channel notification delivery:
 * - In-app notifications (database)
 * - Web push notifications
 * - Email notifications
 * 
 * Manages notification subscriptions and retrieval
 */

require('dotenv').config();
const webpush = require("web-push");
const { sendEmail } = require("../config/mailer");
const prisma = require("../config/prismaClient");

// ==================== Configuration ====================

/**
 * Configure VAPID details for web push notifications
 */
webpush.setVapidDetails(
  "mailto:oyinadeolawoyin@gmail.com",
  process.env.PUBLIC_KEY,
  process.env.PRIVATE_KEY
);

// ==================== Push Notification Helpers ====================

/**
 * Send a web push notification to a specific subscription
 * @param {Object} subscription - Push subscription object
 * @param {Object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body text
 * @param {string} payload.url - URL to open when clicked
 * @private
 */
async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error("Push notification error:", err);
  }
}

// ==================== Unified Notification System ====================

/**
 * Create a notification for a user
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.username - Username of recipient
 * @param {string} notificationData.link - URL link for notification
 * @param {string} notificationData.message - Notification message
 * @param {number} notificationData.userId - User ID of recipient
 * @returns {Promise<Object>} Created notification object
 */
async function addNotification({ username, link, message, userId }) {
  return await prisma.notification.create({
    data: {
      username,
      message,
      link,
      userId
    }
  });
}

/**
 * Notify a user through multiple channels (in-app, push, email)
 * @param {Object} user - User object
 * @param {number} user.id - User ID
 * @param {string} user.username - Username
 * @param {string} user.email - User's email address
 * @param {string} message - Notification message text
 * @param {string} link - URL link related to the notification
 * @returns {Promise<void>}
 */
async function notifyUser(user, message, link) {
  // 1. Save in-app notification in database
  await addNotification({
    username: user.username,
    message,
    link: link,
    userId: Number(user.id)
  });

  // 2. Send web push notifications to all user's subscribed devices
  const subscriptions = await getUserSubscriptions(user.id);
  console.log("sub", subscriptions); // Optional: for debugging
  
  const payload = { 
    title: "New Notification", 
    body: message, 
    url: link 
  };

  // Send to each subscribed device
  subscriptions.forEach(sub => sendPushNotification(sub.subscription, payload));

  // 3. Send email notification
  const html = `<p>${message}</p><p><a href="${link}">View</a></p>`;
  await sendEmail(user.email, "New Notification", html);
}

async function getUserSubscriptions(userId) {
  return await prisma.subscription.findMany({
    where: { userId },
  });
}

// ==================== Subscription Management ====================

/**
 * Save a user's push notification subscription
 * @param {number} userId - User ID
 * @param {Object} subscription - Web push subscription object
 * @returns {Promise<void>}
 */
async function saveSubscription(userId, subscription) {
  const existing = await prisma.subscription.findFirst({
    where: { userId },
  });
  
  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { subscription },
    });
  } else {
    await prisma.subscription.create({
      data: { userId, subscription },
    });
  }  
}

// ==================== Notification Retrieval ====================


/**
 * Get all notifications for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of notification objects
 */
async function fetchNotifications(userId) { 
  return await prisma.notification.findMany({
    where: { userId: Number(userId) },
    orderBy: { id: "desc" } // Latest first
  });
}

/**
 * Mark a notification as read
 * @param {number} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification object
 */
async function markNotificationRead(userId) {
  return await prisma.notification.updateMany({
    where: { 
      userId,
      read: false },
    data: { read: true },
  });
}

// ==================== Exports ====================

module.exports = {
  notifyUser,
  saveSubscription,
  fetchNotifications,
  markNotificationRead
};