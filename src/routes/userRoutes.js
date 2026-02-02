const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateJWT } = require("../config/jwt");

router.get("/", userController.fetchUsers);
router.get("/:userId/user", userController.fetchUser);
// router.post("/updateUser", authenticateJWT, userController.updateUser);

module.exports = router;