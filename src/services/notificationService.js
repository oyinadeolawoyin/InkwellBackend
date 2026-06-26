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
 * @param {string} [notificationData.type] - NotificationType enum value (defaults to GENERAL)
 * @returns {Promise<Object>} Created notification object
 */
async function addNotification({ username, link, message, userId, type }) {
  return await prisma.notification.create({
    data: {
      username,
      message,
      link,
      userId,
      ...(type && { type }),
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

// Types that have their own dedicated page + sidebar badge (Messages,
// Community Updates) instead of the bell/inbox page. For these we still
// want push + email to respect preferences, but we never want a row to
// show up in the main notifications list — that would just duplicate what
// the dedicated page already shows.
const INBOX_EXCLUDED_TYPES = new Set(["MESSAGE", "COMMUNITY_UPDATE"]);

// Preference keys that default to OFF for push/email unless the user has
// explicitly opted in (the opposite of notifyUser()'s normal "send
// everything unless told not to" default). Community updates go out to
// every user on the site per post, so unlike a single-recipient notice
// (a reply, a DM) this one should be opt-in, not opt-out.
const OPT_IN_REQUIRED_KEYS = new Set(["community_new_post"]);

/**
 * Notify a user through multiple channels, respecting their preferences.
 *
 * @param {Object} user          - { id, username, email }
 * @param {string} message       - Notification message text
 * @param {string} link          - URL related to the notification
 * @param {string} [notifKey]    - Preference key (e.g. "discovery_story_liked").
 *                                  When omitted every channel fires (backward-compat).
 * @param {string} [type]        - NotificationType enum value, e.g. "MESSAGE",
 *                                  "COMMUNITY_UPDATE", "REACTION", "COMMENT",
 *                                  "CRITIQUE", "SYSTEM". Defaults to "GENERAL".
 *                                  MESSAGE and COMMUNITY_UPDATE never create an
 *                                  inbox row (see INBOX_EXCLUDED_TYPES) — they're
 *                                  represented by their own page + badge instead.
 */
async function notifyUser(user, message, link, notifKey = null, type = "GENERAL") {
  // Resolve channel permissions from saved preferences.
  // Opt-in-required keys (e.g. community_new_post) start with push/email OFF;
  // everything else starts ON. Either way, an explicit saved preference always
  // wins below.
  const optInRequired = notifKey && OPT_IN_REQUIRED_KEYS.has(notifKey);

  let allowInbox = true;
  let allowPush  = !optInRequired;
  let allowEmail = !optInRequired;

  if (notifKey) {
    try {
      const record = await fetchPreferences(user.id);
      if (record && record.preferences && record.preferences[notifKey]) {
        const p = record.preferences[notifKey];
        // Explicit true/false in the saved record always overrides the
        // default above; only an *absent* key falls back to the default.
        if (p.inbox !== undefined) allowInbox = p.inbox !== false;
        if (p.push  !== undefined) allowPush  = p.push  === true;
        if (p.email !== undefined) allowEmail = p.email === true;
      }
    } catch (err) {
      // If preference lookup fails, fall back to the safe default for this
      // key (opt-in keys stay off; everything else stays on).
      console.error("Preference lookup error:", err);
    }
  }

  // Types with their own dedicated page (Messages, Community Updates) never
  // get an inbox row, no matter what the saved preference says.
  if (INBOX_EXCLUDED_TYPES.has(type)) {
    allowInbox = false;
  }

  // 1. In-app inbox
  if (allowInbox) {
    await addNotification({
      username: user.username,
      message,
      link,
      userId: Number(user.id),
      type,
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
 * Get all notifications for a user, for the main bell/inbox page.
 * Excludes MESSAGE and COMMUNITY_UPDATE types — those have their own
 * dedicated pages (Messages, Community Updates) and sidebar badges, so
 * showing them here too would just be duplicate noise. In practice
 * notifyUser() never writes those types to the inbox in the first place;
 * this filter is just a safety net.
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of notification objects
 */
async function fetchNotifications(userId) {
  return await prisma.notification.findMany({
    where: {
      userId: Number(userId),
      type: { notIn: ["MESSAGE", "COMMUNITY_UPDATE"] },
    },
    orderBy: { id: "desc" } // Latest first
  });
}

/**
 * Mark all of a user's bell-page notifications as read.
 * Same type exclusion as fetchNotifications, so this only ever touches rows
 * the bell page actually shows — it can't silently flip the read state on
 * MESSAGE/COMMUNITY_UPDATE rows that belong to other pages.
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Prisma batch update result
 */
async function markNotificationRead(userId) {
  return await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
      type: { notIn: ["MESSAGE", "COMMUNITY_UPDATE"] },
    },
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