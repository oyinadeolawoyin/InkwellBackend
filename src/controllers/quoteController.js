const quoteService = require("../services/quoteService");

async function createQuote(req, res) {
  const { title, content } = req.body;

  try {
    const quote = await quoteService.createQuote({ title, content });
    res.status(201).json({ quote });
  } catch (error) {
    console.error("Create quote error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function updateQuote(req, res) {
  const { title, content } = req.body;
  const quoteId = Number(req.params.quoteId);

  try {
    const quote = await quoteService.updateQuote({ quoteId, title, content });
    res.status(200).json({ quote });
  } catch (error) {
    console.error("Update quote error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function likeQuote(req, res) {
  const userId = req.user.id;
  const quoteId = Number(req.params.quoteId);

  try {
    const result = await quoteService.toggleLikeQuote({ userId, quoteId });
    res.status(200).json(result);
  } catch (error) {
    console.error("Like quote error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function fetchQuote(req, res) {
  try {
    const quote = await quoteService.fetchQuote();
    
    if (!quote) {
      return res.status(404).json({ message: "No quote found" });
    }

    // Check if current user liked this quote (if authenticated)
    let userLiked = false;
    if (req.user) {
      const like = await quoteService.checkUserLike(req.user.id, quote.id);
      userLiked = !!like;
    }

    res.status(200).json({
      ...quote,
      userLiked
    });
  } catch (error) {
    console.error("Fetch quote error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

module.exports = {
  createQuote,
  updateQuote,
  likeQuote,
  fetchQuote
};