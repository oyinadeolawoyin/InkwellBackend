const quoteService = require("../services/quoteService");


/**
 * Create a new quote and notify all users
 * @route POST /api/quote
 * @access Admin only
 */
async function createQuote(req, res) {
  const { title, content } = req.body;

  // Validation
  if (!content || !content.trim()) {
    return res.status(400).json({ message: "Quote content is required" });
  }

  try {
    // 1. Create the quote
    const quote = await quoteService.createQuote({ 
      title: title || "Quote of the day", 
      content: content.trim() 
    });

    // 2. Fetch all users
    const users = await fetchUsers();

    // 3. Notify all users (don't wait - run in background)
    if (users && users.length > 0) {
      const message = `New daily quote: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`;
      const link = "/";

      // Send notifications in background
      users.forEach(user => {
        notifyUser(user, message, link).catch(err => {
          console.error(`Failed to notify user ${user.id}:`, err);
        });
      });

      console.log(`Sending notifications to ${users.length} users...`);
    }

    // 4. Return success immediately
    res.status(201).json({ 
      quote,
      message: `Quote created successfully. Notifying ${users.length} users...`
    });

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