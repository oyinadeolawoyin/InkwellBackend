const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateJWT } = require("../config/jwt");
const upload = require("../config/multer");

router.get("/founding-writers", userController.fetchFoundingWriters);
// router.get("/", authenticateJWT, userController.fetchUsers);
router.get("/:userId/user", authenticateJWT, userController.fetchUser);
router.post("/updateUser", authenticateJWT, upload.single("avatar"), userController.updateUser);

// Account deletion — soft-deletes the authenticated user's row.
// Personal data is wiped; comments/feedback they left on others' content
// are preserved with a null author (shown as "[deleted]" in the UI).
router.delete("/me", authenticateJWT, userController.deleteUser);

module.exports = router;