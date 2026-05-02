require("dotenv").config();
const userService = require("../services/userService");
const fileUploader = require("../utilis/fileUploader");

async function updateUser(req, res) {
  try {
    // Guard: multer only parses multipart; JSON-only requests (e.g. email update)
    // need express.json() in app.js. This guard prevents a crash if body is missing.
    if (!req.body) {
      return res.status(400).json({ message: "Request body is missing. Ensure express.json() middleware is registered in app.js." });
    }
    const { username, email, bio, dateOfBirth } = req.body;
    const userId = Number(req.user.id);
    const file = req.file;

    const charCount = bio ? bio.trim().length : 0;
    if (charCount > 400) {
      return res.status(400).json({ message: "Bio content must not exceed 400 characters." });
    }

    // Validate date of birth if provided
    if (dateOfBirth !== undefined && dateOfBirth !== null && dateOfBirth !== "") {
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json({ message: "Please enter a valid date of birth." });
      }
      // Must be in the past and not unreasonably old
      const now = new Date();
      const minDob = new Date(now.getFullYear() - 120, 0, 1);
      if (dob >= now) {
        return res.status(400).json({ message: "Date of birth must be in the past." });
      }
      if (dob < minDob) {
        return res.status(400).json({ message: "Please enter a valid date of birth." });
      }
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
    if (username    !== undefined) updateData.username    = username;
    if (email       !== undefined) updateData.email       = email.trim();
    if (bio         !== undefined) updateData.bio         = bio;
    if (avatar)                    updateData.avatar      = avatar;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth || null;

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