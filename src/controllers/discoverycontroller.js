const discoveryService = require("../services/discoveryservice");
const { uploadFile, deleteFile } = require("../utilis/fileUploader");
const { notifyUser } = require("../services/notificationService");
const prisma = require("../config/prismaClient");

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Load a full user row (id, username, email) by id.
 * Returns null if not found — callers should guard against this.
 */
async function getUser(userId) {
  return prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { id: true, username: true, email: true },
  });
}

// ─── Stories ──────────────────────────────────────────────────────────────────

async function createStory(req, res) {
  const userId = req.user.id;
  const {
    title,
    genre,
    synopsis,
    firstChapter,
    firstChapterTitle,
    authorName,
    recommendedBy,
    platform,
    platformLink,
  } = req.body;

  // contentWarnings arrives as a repeated field from FormData — normalise to array
  const rawWarnings = req.body.contentWarnings;
  const contentWarnings = Array.isArray(rawWarnings)
    ? rawWarnings
    : rawWarnings
    ? [rawWarnings]
    : [];

  if (
    !title ||
    !genre ||
    !synopsis ||
    !firstChapter ||
    !authorName ||
    !platform ||
    !platformLink
  ) {
    return res.status(400).json({
      message:
        "title, genre, synopsis, firstChapter, authorName, platform, and platformLink are required.",
    });
  }
  console.log("firstchap", firstChapterTitle, "warn", rawWarnings);
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
      firstChapterTitle,
      coverUrl,
      authorName,
      recommendedBy,
      platform,
      platformLink,
      contentWarnings,
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
  const userId = req.query.userId ? Number(req.query.userId) : undefined;

  try {
    const result = await discoveryService.getStories({ page, limit, genre, userId });

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
    if (
      !story.isApproved &&
      (!req.user || (req.user.id !== story.userId && req.user.role !== "ADMIN"))
    ) {
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
  const { title, genre, synopsis, firstChapter, firstChapterTitle, authorName, recommendedBy, platform, platformLink } =
    req.body;

  const rawWarnings = req.body.contentWarnings;
  const contentWarnings = rawWarnings !== undefined
    ? Array.isArray(rawWarnings) ? rawWarnings : [rawWarnings]
    : undefined;

  try {
    const existing = await discoveryService.findStory(storyId);
    if (!existing) return res.status(404).json({ message: "Story not found." });
    if (existing.userId !== userId && !isAdmin)
      return res.status(403).json({ message: "Not authorized." });

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
      firstChapterTitle,
      coverUrl,
      authorName,
      recommendedBy,
      platform,
      platformLink,
      contentWarnings,
    });

    res.status(200).json({ story });
  } catch (error) {
    console.error("Update discovery story error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function approveStory(req, res) {
  const storyId = Number(req.params.storyId);
  const isAdmin = req.user.role === "ADMIN";

  try {
    if (!isAdmin) return res.status(403).json({ message: "Not authorized." });
    const existing = await discoveryService.findStory(storyId);
    if (!existing) return res.status(404).json({ message: "Story not found." });

    const story = await discoveryService.approveStory(storyId);

    // ── Notify the author their story is live ─────────────────────────────
    const author = await getUser(existing.userId);
    if (author) {
      notifyUser(
        author,
        `Your story "${existing.title}" has been approved and is now live on the Discovery page!`,
        `/discovery/${storyId}`, "discovery_story_approved"
      );
    }

    // ── Notify all other users about the new story drop ───────────────────
    // Fire-and-forget so the response isn't delayed.
    (async () => {
      try {
        const users = await prisma.user.findMany({
          select: { id: true, username: true, email: true },
        });

        const message = `A new story has been added to the Discovery page: "${existing.title}" by ${existing.authorName}.`;
        const link = `/discovery/${storyId}`;

        await Promise.allSettled(
          users
            .filter((u) => u.id !== existing.userId) // author already notified above
            .map((u) => notifyUser(u, message, link, "discovery_new_story"))
        );
      } catch (err) {
        console.error("Discovery approval broadcast error:", err);
      }
    })();

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
    if (existing.userId !== userId && !isAdmin)
      return res.status(403).json({ message: "Not authorized." });

    const coverUrl = await discoveryService.deleteStory(storyId);
    if (coverUrl) await deleteFile(coverUrl);

    res.status(200).json({ message: "Story deleted successfully." });
  } catch (error) {
    console.error("Delete discovery story error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ── toggleLike — notifies the story author when someone likes their work ──────
async function toggleLike(req, res) {
  const storyId = Number(req.params.storyId);
  const userId = req.user.id;

  try {
    const result = await discoveryService.toggleLike(userId, storyId);

    // Only notify on a new like, not on unlike.
    if (result.liked) {
      (async () => {
        try {
          const story = await discoveryService.getStory(storyId);
          if (!story) return;

          // Don't notify if the user liked their own story.
          if (story.userId === userId) return;

          const author = await getUser(story.userId);
          const liker = await getUser(userId);
          if (!author || !liker) return;

          await notifyUser(
            author,
            `${liker.username} liked your story "${story.title}".`,
            `/discovery/${storyId}`, "discovery_story_liked"
          );
        } catch (err) {
          console.error("Like notification error:", err);
        }
      })();
    }

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