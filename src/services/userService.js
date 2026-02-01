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
    role 
  }) {
    return await prisma.user.create({
      data: {
        username,
        password,
        email,
        role: role || "USER" 
      }
    });
}

async function updateUser({ 
  userId,
  username,  
  email, 
  bio,
  avartar
}) {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      username,
      email,
      bio,
      avartar
    },
  });
}

/**
 * Fetch all users
 * @returns {Promise<Array>} Array of all user objects
 */
async function fetchUsers() {
  return await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      createdAt: true
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
  });
}

/**
 * Delete a user by ID
 * @param {number} id - User ID to delete
 * @returns {Promise<Object>} Deleted user object
 */
async function deleteUser(userId) {
  return await prisma.user.delete({
    where: { id: userId }
  });
}


// ==================== Exports ====================

module.exports = {
  countUsers,
  createUser,
  updateUser,
  fetchUsers,
  fetchUser,
  deleteUser,
};