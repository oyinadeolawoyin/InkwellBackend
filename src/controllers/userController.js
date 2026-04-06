require("dotenv").config();
const userService = require("../services/userService");
const fileUploader = require("../utilis/fileUploader");

async function updateUser(req, res) {
  try {
    const { username, email, bio } = req.body;
    const userId = Number(req.user.id);
    const file = req.file;

    const charCount = bio ? bio.trim().length : 0;
    if (charCount > 400) {
      return res.status(400).json({ message: "Bio content must not exceed 400 characters." });
    }

    // Validate email format if provided
    if (email !== undefined && email !== null && email !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Please enter a valid email address." });
      }

      // Check email isn't already taken by another user
      const existingEmail = await userService.findUserByEmail(email.trim());
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(409).json({ message: "That email is already in use by another account." });
      }
    }

    // Get current user
    const existingUser = await userService.fetchUser(userId);

    let avatar; // intentionally undefined by default

    // If user uploaded a new avatar
    if (file) {
      if (existingUser.avatar) {
        await fileUploader.deleteFile(existingUser.avatar);
      }
      avatar = await fileUploader.uploadFile(file);
    }

    // Build update payload — only include defined fields so partial updates work
    const updateData = { userId };
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email.trim();
    if (bio !== undefined) updateData.bio = bio;
    if (avatar) updateData.avatar = avatar;

    const user = await userService.updateUser(updateData);

    res.status(200).json({ user });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}

async function fetchUsers(req, res) {
  try {
    const users = await userService.fetchUsers();
    res.status(200).json({ users });
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ message: error.message || "Something went wrong. Please try again." });
  }
}

async function fetchUser(req, res) {
  const userId = req.params.userId;
  try {
    const user = await userService.fetchUser(Number(userId));
    res.status(200).json({ user });
  } catch (error) {
    console.error("Fetch user error:", error);
    res.status(500).json({ message: error.message || "Something went wrong. Please try again." });
  }
}

async function deleteUser(req, res) {
  const userId = req.user.id;
  try {
    await userService.deleteUser(Number(userId));
    res.status(200).json({ message: "User deletion successful." });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: error.message || "Something went wrong. Please try again." });
  }
}

async function fetchFoundingWriters(req, res) {
  try {
    const users = await userService.fetchFoundingWriters();
    res.status(200).json({ users });
  } catch (error) {
    console.error("Fetch founding writers error:", error);
    res.status(500).json({ message: error.message || "Something went wrong. Please try again." });
  }
}

module.exports = {
  updateUser,
  fetchUsers,
  fetchUser,
  deleteUser,
  fetchFoundingWriters,
};