const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateJWT } = require("../config/jwt");
const upload = require("../config/multer");

router.get("/founding-writers", userController.fetchFoundingWriters);
router.get("/", userController.fetchUsers);
router.get("/:userId/user", userController.fetchUser);
router.post("/updateUser", authenticateJWT, upload.single("avatar"), userController.updateUser);

module.exports = router;