require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("../config/jwt")
const authService = require("../services/authService");
const userService = require("../services/userService");
const { validationResult } = require("express-validator");
const crypto = require("crypto");
const { sendEmail } = require("../config/mailer");

// ============================================
// CONFIGURATION
// ============================================

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 1000 * 60 * 60 * 24 * 21,
};


// ============================================
// AUTHENTICATION OPERATIONS
// ============================================

/**
 * Register a new user
 * @route POST /auth/signup
 */
async function signup(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(" ");
    return res.status(400).json({ message: errorMessages });
  }

  const { username, password, email, timezone } = req.body;

  try {
    const existingEmail = await authService.findUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ message: "Email is already in use." });
    }

    const existingUsername = await authService.findUserByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ message: "Username is already taken. Please choose another one." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userCount = await userService.countUsers();
    const isPremiumEligible = userCount < 10;

    const user = await userService.createUser({
      username,
      password: hashedPassword,
      email,
      timezone,
      role: isPremiumEligible ? "FOUNDING_WRITER" : "USER"
    });

    const token = jwt.generateToken(user);
    res.cookie("token", token, cookieOptions).status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

/**
 * Log in a user.
 *
 * Supports two login flows:
 *   1. Email + password  (site-registered users)
 *   2. Discord ID + password  (users auto-created via Discord bot)
 *
 * The client sends { identifier, password } where identifier is either
 * an email address or a numeric Discord ID string.
 *
 * @route POST /auth/login
 */
async function login(req, res) {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Please provide your login details and password." });
  }

  try {
    let user = null;

    // Determine whether identifier is a Discord ID (17–20 digit string) or email
    const isDiscordId = /^\d{17,20}$/.test(identifier.trim());

    if (isDiscordId) {
      user = await authService.findUserByDiscordId(identifier.trim());
      if (!user) {
        return res.status(404).json({ message: "No account found with that Discord ID." });
      }
    } else {
      user = await authService.findUserByEmail(identifier.trim());
      if (!user) {
        return res.status(404).json({ message: "No account found with that email." });
      }
    }

    // Account has no password set yet (Discord-only, never set a password)
    if (!user.password) {
      return res.status(400).json({
        message: "This account doesn't have a password yet. Please go to Settings to set one first.",
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    const token = jwt.generateToken(user);
    res.cookie("token", token, cookieOptions).status(200).json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, discordId: user.discordId }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

/**
 * Log out the current user
 * @route POST /auth/logout
 */
function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.status(200).json({ message: "Logged out successfully" });
}

/**
 * Get current authenticated user's info
 * @route GET /auth/me
 */
async function getMe(req, res) {
  try {
    const user = req.user;
    res.status(200).json(user);
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}

/**
 * Change or set a password for the authenticated user.
 *
 * Two cases:
 *   - User already has a password → requires currentPassword for verification
 *   - Discord-only user (no password yet) → sets password directly, no currentPassword needed
 *
 * @route PATCH /auth/changePassword
 */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const userId = Number(req.user.id);

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters." });
  }

  // Basic strength check
  if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) || !/[\W_]/.test(newPassword)) {
    return res.status(400).json({
      message: "Password must contain uppercase, lowercase, a number, and a special character."
    });
  }

  try {
    const existingUser = await userService.fetchUser(userId);

    if (existingUser.password) {
      // User already has a password — verify the current one first
      if (!currentPassword) {
        return res.status(400).json({ message: "Please provide your current password." });
      }
      const valid = await bcrypt.compare(currentPassword, existingUser.password);
      if (!valid) {
        return res.status(401).json({ message: "Current password is incorrect." });
      }
    }
    // else: Discord-only account, no current password required — just set the new one

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await authService.updatePassword(userId, hashedPassword);

    res.status(200).json({
      message: existingUser.password
        ? "Password updated successfully."
        : "Password set! You can now log in with your Discord ID and this password.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}


// ============================================
// PASSWORD RESET OPERATIONS
// ============================================

/**
 * Initiate password reset — sends reset email
 * @route POST /auth/forgetPassword
 */
async function forgetPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await authService.findUserByEmail(email);

    // Generic response to prevent email enumeration
    if (!user) {
      return res.status(200).json({ message: "If an account exists, a reset email has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await authService.saveResetToken(user.id, resetToken, resetTokenExpiry);

    const resetLink = `inkwellinky.vercel.app/reset-password?token=${resetToken}`;

    await sendEmail(
      user.email,
      "Password Reset Request",
      `<p>Hello ${user.username},</p>
       <p>You requested to reset your password. Click the link below:</p>
       <a href="${resetLink}">${resetLink}</a>
       <p>This link will expire in 15 minutes.</p>
       <p>If you didn't request this, please ignore this email.</p>`
    );

    res.status(200).json({ message: "Password reset email sent!" });
  } catch (error) {
    console.error("Forget password error:", error);
    res.status(500).json({ message: "Error processing request" });
  }
}

/**
 * Reset password using token
 * @route POST /auth/resetPassword
 */
async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token and new password are required" });
  }

  try {
    const user = await authService.findUserByResetToken(token);

    if (!user || user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await authService.updatePassword(Number(user.id), hashedPassword);
    await authService.clearResetToken(Number(user.id));

    res.status(200).json({ message: "Password reset successful!" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  signup,
  login,
  logout,
  getMe,
  changePassword,
  forgetPassword,
  resetPassword,
};