/**
 * User Service
 * 
 * Comprehensive user management service handling:
 * - User CRUD operations
 * - Social profile management
 * - Follow/unfollow functionality
 * - Library management (saved content)
 * - Notification management
 * - Push notification subscriptions
 */

const prisma = require("../config/prismaClient");

// ==================== User Operations ====================

/**
 * Count total number of users
 * @returns {Promise<number>} Total user count
 */
async function countUsers() {
  return await prisma.user.count();
}


/**
 * Create a new user account
 * @param {Object} userData - User data object
 * @param {string} userData.username - Username
 * @param {string} userData.password - Hashed password
 * @param {string} userData.email - Email address
 * @returns {Promise<Object>} Created user object
 */
async function createUser({ 
    username, 
    password, 
    email, 
    timezone,
    role 
  }) {
    return await prisma.user.create({
      data: {
        username,
        password,
        email,
        timezone: timezone?.trim(),
        role: role || "USER" 
      }
    });
}

async function updateUser({
  userId,
  username,
  email,
  bio,
  avatar,
  dateOfBirth,
}) {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, email: true },
  });

  if (!existingUser) {
    throw new Error("User not found");
  }

  const data = {};

  if (username && username !== existingUser.username) {
    data.username = username;
  }

  if (email && email !== existingUser.email) {
    data.email = email;
  }

  if (bio          !== undefined) data.bio         = bio;
  if (avatar       !== undefined) data.avatar      = avatar;
  if (dateOfBirth  !== undefined) data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

  return prisma.user.update({
    where: { id: userId },
    data,
  });
}


/**
 * Fetch all users
 * @returns {Promise<Array>} Array of all user objects
 */
async function fetchUsers() {
  return await prisma.user.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
    },
    orderBy: {
      id: 'desc'
    }
  });
}

/**
 * Fetch a single user by ID with social data, followers, and content stats
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User object with social, follower data, and content counts
 */
async function fetchUser(userId) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      bio: true,       
      avatar: true,
      role: true,
      createdAt: true,
      isDeleted: true,
    }
  });
}

// Add this to userService.js — internal use only, never sent to frontend
async function fetchUserWithPassword(userId) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      password: true, // needed for password verification only
      role: true,
      isDeleted: true,
    }
  });
}

/**
 * Find a user by their email address.
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
async function findUserByEmail(email) {
  return await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isDeleted: true },
  });
}

/**
 * Soft-delete a user account (Reddit-style).
 *
 * What happens:
 *  - Personal data is wiped: email, password, avatar, bio, dateOfBirth,
 *    discordId, resetToken are all nulled out.
 *  - username is replaced with "[deleted]" (with a unique suffix so the
 *    @unique constraint keeps working).
 *  - isDeleted is set to true and deletedAt records the timestamp.
 *
 * What is preserved:
 *  - Comments, replies, feedback responses, paragraph comments on other
 *    people's content — those rows still exist but their author FK is
 *    set to NULL by the database (onDelete: SetNull in the schema).
 *    The UI should render "[deleted]" wherever it sees a null author.
 *
 * What is hard-deleted by the DB (onDelete: Cascade):
 *  - Projects, sprints, notes, todolists, notifications, their own
 *    wall-received posts, likes, feedback submissions, etc. — anything
 *    that is purely the user's private data.
 *
 * @param {number} userId
 * @returns {Promise<Object>} The anonymised user row
 */
async function deleteUser(userId) {
  // Use a timestamp suffix to keep the username unique even if someone later
  // registers the original username (which would also be "[deleted]").
  const anonymousUsername = `[deleted]_${userId}_${Date.now()}`;

  return await prisma.user.update({
    where: { id: userId },
    data: {
      isDeleted:        true,
      deletedAt:        new Date(),
      // Wipe all personal identifiers
      username:         anonymousUsername,
      email:            null,
      password:         null,
      discordId:        null,
      avatar:           null,
      bio:              null,
      dateOfBirth:      null,
      resetToken:       null,
      resetTokenExpiry: null,
    },
  });
}


async function fetchFoundingWriters() {
  return await prisma.user.findMany({
    where: { role: "FOUNDING_WRITER", isDeleted: false },
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      createdAt: true,
    },
    orderBy: { id: "asc" },
  });
}

// ==================== Exports ====================

module.exports = {
  countUsers,
  createUser,
  updateUser,
  fetchUsers,
  fetchUser,
  fetchUserWithPassword,
  findUserByEmail,
  deleteUser,
  fetchFoundingWriters,
};