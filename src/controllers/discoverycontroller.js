const discoveryService = require("../services/discoveryservice");
const { uploadFile, deleteFile } = require("../utilis/fileUploader");

// ─── Stories ──────────────────────────────────────────────────────────────────

async function createStory(req, res) {
  const userId = req.user.id;
  const { title, genre, synopsis, firstChapter, authorName, recommendedBy, platform, platformLink } = req.body;

  if (!title || !genre || !synopsis || !firstChapter || !authorName || !platform || !platformLink) {
    return res.status(400).json({ message: "title, genre, synopsis, firstChapter, authorName, platform, and platformLink are required." });
  }

  try {
    let coverUrl = null;
    if (req.file) {
      coverUrl = await uploadFile(req.file);
    }

    const story = await discoveryService.createStory({
      userId,
      title,
      genre,
      synopsis,
      firstChapter,
      coverUrl,
      authorName,
      recommendedBy,
      platform,
      platformLink,
    });

    res.status(201).json({ story });
  } catch (error) {
    console.error("Create discovery story error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function getStories(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const genre = req.query.genre || undefined;

  try {
    const result = await discoveryService.getStories({ page, limit, genre });

    // Attach liked status if user is authenticated
    if (req.user) {
      const storyIds = result.stories.map((s) => s.id);
      const likedIds = await discoveryService.getUserLikes(req.user.id, storyIds);
      result.stories = result.stories.map((s) => ({
        ...s,
        likedByUser: likedIds.includes(s.id),
      }));
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Get discovery stories error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function getStory(req, res) {
  const storyId = Number(req.params.storyId);

  try {
    const story = await discoveryService.getStory(storyId);
    if (!story) return res.status(404).json({ message: "Story not found." });
    if (!story.isApproved && (!req.user || (req.user.id !== story.userId && req.user.role !== "ADMIN"))) {
      return res.status(404).json({ message: "Story not found." });
    }

    let likedByUser = false;
    if (req.user) {
      const likedIds = await discoveryService.getUserLikes(req.user.id, [storyId]);
      likedByUser = likedIds.includes(storyId);
    }

    res.status(200).json({ story: { ...story, likedByUser } });
  } catch (error) {
    console.error("Get discovery story error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function updateStory(req, res) {
  const storyId = Number(req.params.storyId);
  const userId = req.user.id;
  const isAdmin = req.user.role === "ADMIN";
  const { title, genre, synopsis, firstChapter, authorName, recommendedBy, platform, platformLink } = req.body;

  try {
    const existing = await discoveryService.findStory(storyId);
    if (!existing) return res.status(404).json({ message: "Story not found." });
    if (existing.userId !== userId && !isAdmin) return res.status(403).json({ message: "Not authorized." });

    let coverUrl;
    if (req.file) {
      if (existing.coverUrl) await deleteFile(existing.coverUrl);
      coverUrl = await uploadFile(req.file);
    }

    const story = await discoveryService.updateStory(storyId, {
      title,
      genre,
      synopsis,
      firstChapter,
      coverUrl,
      authorName,
      recommendedBy,
      platform,
      platformLink,
    });

    res.status(200).json({ story });
  } catch (error) {
    console.error("Update discovery story error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function approveStory(req, res) {
  const storyId = Number(req.params.storyId);

  try {
    const existing = await discoveryService.findStory(storyId);
    if (!existing) return res.status(404).json({ message: "Story not found." });

    const story = await discoveryService.approveStory(storyId);
    res.status(200).json({ story });
  } catch (error) {
    console.error("Approve discovery story error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function deleteStory(req, res) {
  const storyId = Number(req.params.storyId);
  const userId = req.user.id;
  const isAdmin = req.user.role === "ADMIN";

  try {
    const existing = await discoveryService.findStory(storyId);
    if (!existing) return res.status(404).json({ message: "Story not found." });
    if (existing.userId !== userId && !isAdmin) return res.status(403).json({ message: "Not authorized." });

    const coverUrl = await discoveryService.deleteStory(storyId);
    if (coverUrl) await deleteFile(coverUrl);

    res.status(200).json({ message: "Story deleted successfully." });
  } catch (error) {
    console.error("Delete discovery story error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function toggleLike(req, res) {
  const storyId = Number(req.params.storyId);  
  const userId = req.user.id;

  try {
    const result = await discoveryService.toggleLike(userId, storyId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Toggle discovery like error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

async function getPendingStories(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const result = await discoveryService.getPendingStories({ page, limit });
    res.status(200).json(result);
  } catch (error) {
    console.error("Get pending discovery stories error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

module.exports = {
  createStory,
  getStories,
  getStory,
  updateStory,
  approveStory,
  deleteStory,
  toggleLike,
  getPendingStories,
};