const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const discordController = require("../controllers/discordController");
const { body } = require("express-validator");
const { authenticateJWT } = require("../config/jwt");
const { validationResult } = require("express-validator");

// ─── Validation ───────────────────────────────────────────────

const validateForm = [
  body("username")
    .matches(/^[A-Za-z0-9_.-]+$/)
    .withMessage("Username can only contain letters, numbers, underscores, dots, or dashes.")
    .trim()
    .isLength({ min: 3, max: 15 })
    .withMessage("Username must be between 3 and 15 characters.")
    .escape(),
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email address.")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter.")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter.")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number.")
    .matches(/[\W_]/)
    .withMessage("Password must contain at least one special character."),
];

// ─── Auth routes ──────────────────────────────────────────────

router.post("/signup", validateForm, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    return res.status(400).json({ errors: errorMessages });
  }
  authController.signup(req, res);
});

router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", authenticateJWT, authController.getMe);
router.post("/forgetPassword", authController.forgetPassword);
router.post("/resetPassword", authController.resetPassword);

// ─── Discord linking — authenticated site users ───────────────
router.patch("/discord/link", authenticateJWT, discordController.linkDiscord);
router.patch("/discord/unlink", authenticateJWT, discordController.unlinkDiscord);

// ─── Discord bot upsert — bot secret only, no JWT ────────────
router.post("/discord/bot/upsert", requireBotSecret, discordController.botUpsertUser);

module.exports = router;

// ─── Bot secret middleware ────────────────────────────────────
function requireBotSecret(req, res, next) {
  if (req.headers["x-bot-secret"] !== process.env.BOT_SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}