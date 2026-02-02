const express = require("express");
const router = express.Router();
const quoteController = require("../controllers/quoteController");
const { authenticateJWT } = require("../config/jwt");

router.get("/", quoteController.fetchQuote);
router.post("/createQuote", authenticateJWT, quoteController.createQuote);
router.post("/:quoteId/update", authenticateJWT, quoteController.updateQuote);
router.post("/:quoteId/like", authenticateJWT, quoteController.likeQuote);

module.exports = router;