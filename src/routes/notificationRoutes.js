const express = require("express");
const router = express.Router();
const notificationsController = require("../controllers/notificationController");
const { authenticateJWT } = require("../config/jwt");

router.get("/", authenticateJWT, notificationsController.getNotifications);
router.post("/save-subscription", authenticateJWT, notificationsController.saveSubscription);
router.post("/:userId/read", authenticateJWT, notificationsController.markRead);

module.exports = router;