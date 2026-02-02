const quoteService = require("../services/quoteService");
// const userService = require("../services/userService");

async function createQuote(req, res) {
  try {
    const { title, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Quote content is required." });
    }

    //Create the quote
    const quote = await quoteService.createQuote({
      title,
      content,
    });

    // //Fetch all users
    // const users = await userService.fetchUsers();

    // //Notify users (fire-and-forget style)
    // const message = content;
    // const link = `/quotes/${quote.id}`; // or homepage

    // users.forEach((user) => {
    //   // optional: skip admin / creator
    //   if (user.id === req.user.id) return;

    //   notifyUser(user, message, link).catch((err) =>
    //     console.error(`Notification failed for user ${user.id}`, err)
    //   );
    // });

    //Respond immediately (don’t wait for notifications)
    res.status(201).json({ quote });
  } catch (error) {
    console.error("Create quote error:", error);
    res.status(500).json({ message: "Failed to create quote." });
  }
}

async function updateQuote(req, res) {
  try {
    const quoteId = Number(req.params.quoteId);
    const { title, content } = req.body;

    const quote = await quoteService.updateQuote({
      quoteId,
      title,
      content,
    });

    res.status(200).json({ quote });
  } catch (error) {
    console.error("Update quote error:", error);
    res.status(500).json({ message: "Failed to update quote." });
  }
}

async function likeQuote(req, res) {
  try {
    const quoteId = Number(req.params.quoteId);
    const userId = req.user.id;

    const { liked, likesCount } =
      await quoteService.toggleLikeQuote({ userId, quoteId });

    res.status(200).json({
      liked,
      likesCount,
      message: liked ? "Quote liked." : "Quote unliked.",
    });
  } catch (error) {
    console.error("Toggle quote like error:", error);
    res.status(500).json({ message: "Failed to update quote like." });
  }
}

async function fetchQuote(req, res) {
  try {
    const quote = await quoteService.fetchQuote();

    if (!quote) {
      return res.status(404).json({ message: "No quote available yet." });
    }

    res.status(200).json({ quote });
  } catch (error) {
    console.error("Fetch quote error:", error);
    res.status(500).json({ message: "Failed to fetch quote." });
  }
}

module.exports = {
  createQuote,
  updateQuote,
  likeQuote,
  fetchQuote
};