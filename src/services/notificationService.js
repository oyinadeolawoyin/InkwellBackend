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

async function getUserSubscriptions(userId) {
  return await prisma.subscription.findMany({
    where: { userId },
  });
}

// ─── Add these to notificationService.js ────────────────────────────────────
//
// Also REPLACE your existing notifyUser() with the version below —
// it checks the user's saved preferences before sending each channel.

// ==================== Preference Management ====================

/**
 * Fetch a user's notification preferences JSON blob
 */
async function fetchPreferences(userId) {
  return await prisma.notificationPreference.findUnique({
    where: { userId: Number(userId) },
  });
}

/**
 * Upsert a user's notification preferences
 */
async function savePreferences(userId, preferences) {
  return await prisma.notificationPreference.upsert({
    where: { userId: Number(userId) },
    update: { preferences },
    create: { userId: Number(userId), preferences },
  });
}

// ==================== Preference-Aware notifyUser ====================

/**
 * Notify a user through multiple channels, respecting their preferences.
 *
 * @param {Object} user          - { id, username, email }
 * @param {string} message       - Notification message text
 * @param {string} link          - URL related to the notification
 * @param {string} [notifKey]    - Preference key (e.g. "discovery_story_liked").
 *                                  When omitted every channel fires (backward-compat).
 */
async function notifyUser(user, message, link, notifKey = null) {
  // Resolve channel permissions from saved preferences
  let allowInbox = true;
  let allowPush  = true;
  let allowEmail = true;

  if (notifKey) {
    try {
      const record = await fetchPreferences(user.id);
      if (record && record.preferences && record.preferences[notifKey]) {
        const p = record.preferences[notifKey];
        allowInbox = p.inbox  !== false;
        allowPush  = p.push   !== false;
        allowEmail = p.email  !== false;
      }
    } catch (err) {
      // If preference lookup fails, default to sending everything
      console.error("Preference lookup error:", err);
    }
  }

  // 1. In-app inbox
  if (allowInbox) {
    await addNotification({
      username: user.username,
      message,
      link,
      userId: Number(user.id),
    });
  }

  // 2. Web push
  if (allowPush) {
    const subscriptions = await getUserSubscriptions(user.id);
    const payload = { title: "New Notification", body: message, url: link };
    subscriptions.forEach((sub) => sendPushNotification(sub.subscription, payload));
  }

  // 3. Email
  if (allowEmail) {
    const baseUrl = process.env.ALLOWED_ORIGIN; // e.g. https://inkwell.com.ng or http://localhost:5173
    const fullLink = `${baseUrl}${link}`;       // e.g. https://inkwell.com.ng/discovery/12
    const html = `<p>${message}</p><p><a href="${fullLink}">View on Inkwell</a></p>`;
    await sendEmail(user.email, "New Notification", html);
  }
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
  fetchPreferences,
  savePreferences,
  saveSubscription,
  fetchNotifications,
  markNotificationRead
};