require("dotenv").config();
const userService = require("../services/userService");
const fileUploader = require("../utilis/fileUploader");

async function updateUser(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array() });
    }
  
    try {
      const { username, email, bio } = req.body;
      const userId = Number(req.user.id);
      const file = req.file;
  
      const charCount = bio ? bio.trim().length : 0;
      if (charCount > 400) {
        return res.status(400).json({ message: "Bio content must not exceed 400 characters." });
      }
  
      //Get current user
      const existingUser = await userService.fetchUser(userId);
  
      let avatar; // intentionally undefined by default
  
      //If user uploaded a new avatar
      if (file) {
        // delete old avatar if it exists
        if (existingUser.avatar) {
          await fileUploader.deleteFile(existingUser.avatar);
        }
  
        // upload new avatar
        avatar = await fileUploader.uploadFile(file);
      }
  
      //Build update payload carefully
      const updateData = {
        username,
        email,
        bio,
        userId,
      };
  
      // only attach avatar if user uploaded a new one
      if (avatar) {
        updateData.avatar = avatar;
      }
  
      const user = await userService.updateUser(updateData);
  
      res.status(200).json({ user });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({
        message: error.message || "Something went wrong. Please try again.",
      });
    }
}  

async function fetchUsers(req, res) {
    try {
        const users = await userService.fetchUsers();
        res.status(200).json({ users });
    } catch(error) {
        console.error("Fetch users error:", error);
        res.status(500).json({ message: error.message || "Something went wrong. Please try again." });
    }
}

async function fetchUser(req, res) {
    const userId = req.user.id;
    try {
        const user = await userService.fetchUser(Number(userId));
        res.status(200).json({ user });
    } catch(error) {
        console.error("Fetch user error:", error);
        res.status(500).json({ message: error.message || "Something went wrong. Please try again." });
    }
}

async function deleteUser(req, res) {
    const userId = req.user.id;
    try {
        await userService.deleteUser(Number(userId));
        res.status(200).json({ message: "User deletion successful." });
    } catch(error) {
        console.error("Delete user error:", error);
        res.status(500).json({ message: error.message || "Something went wrong. Please try again." });
    }
}

module.exports = {
    updateUser,
    fetchUsers,
    fetchUser,
    deleteUser
}