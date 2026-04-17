const groupSprintService = require("../services/groupSprintService");
const { notifyUser } = require('../services/notificationService');
const { AccessToken, TrackSource } = require("livekit-server-sdk");
const {
  notifyGroupSprintStarted,
  notifyGroupSprintEnded,
  notifyMemberCheckedIn,
  notifyMemberCheckedOut,
} = require('../services/discordService');

// ─── GROUP SPRINT ─────────────────────────────────────────────
async function startGroupSprint(req, res) {
  const { duration, visibility, sprintType, userId: bodyUserId, username: bodyUsername } = req.body;

  const userId   = req.user ? Number(req.user.id)       : Number(bodyUserId);
  const username = req.user ? req.user.username          : bodyUsername;

  if (!userId || !username) {
    return res.status(400).json({ message: "Missing userId or username" });
  }

  const allowedVisibilities = ["PUBLIC", "PRIVATE"];
  const resolvedVisibility  = allowedVisibilities.includes(visibility) ? visibility : "PUBLIC";

  const allowedSprintTypes  = ["WRITING", "READING"];
  const resolvedSprintType  = allowedSprintTypes.includes(sprintType)  ? sprintType  : "WRITING";

  try {
    const groupSprint = await groupSprintService.startGroupSprint(
      userId, Number(duration), resolvedVisibility, resolvedSprintType
    );

    notifyGroupSprintStarted({
      username,
      duration,
      groupSprintId: groupSprint.id,
    }).catch((err) => console.error("Discord sprint-started notify failed:", err));

    res.status(201).json({ groupSprint });
  } catch (error) {
    console.error("Group sprint start error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function endGroupSprint(req, res) {
  const groupSprintId = Number(req.params.groupSprintId);

  try {
    const groupSprint = await groupSprintService.endGroupSprint(groupSprintId);

    const user    = req.user;
    const message = "You did great for arranging the sprint and helping others write. You should be proud of yourself 🌱";
    const link    = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;
    await notifyUser(user, message, link);

    if (!groupSprint.isActive) {
      notifyGroupSprintEnded({
        groupSprintId,
        totalWordsWritten: groupSprint.totalWordsWritten,
      }).catch((err) => console.error("Discord sprint-ended notify failed:", err));
    }

    res.status(200).json({ groupSprint });
  } catch (error) {
    console.error("Group sprint end error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function fetchGroupSprint(req, res) {
  const groupSprintId = Number(req.params.groupSprintId);
  try {
    const groupSprint = await groupSprintService.fetchGroupSprint(groupSprintId);
    if (!groupSprint) {
      return res.status(404).json({ message: "Group sprint not found" });
    }
    res.status(200).json({ groupSprint });
  } catch (error) {
    console.error("Fetch group sprint error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function fetchAllActiveGroupSprints(req, res) {
  const page  = Number(req.query.page)  || 1;
  const limit = Number(req.query.limit) || 10;
  const skip  = (page - 1) * limit;

  try {
    const result = await groupSprintService.fetchAllActiveGroupSprints({ skip, take: limit });

    res.status(200).json({
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      groupSprints: result.groupSprints,
    });
  } catch (error) {
    console.error("Fetch active group sprints error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function fetchLastGroupSprint(req, res) {
  try {
    const groupSprint = await groupSprintService.fetchLastGroupSprint();
    if (!groupSprint) {
      return res.status(404).json({ message: "No completed group sprint found" });
    }
    res.status(200).json({ groupSprint });
  } catch (error) {
    console.error("Fetch last group sprint error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─── SPRINT ───────────────────────────────────────────────────

async function joinSprint(req, res) {
  const { groupSprintId, checkin, startWords, soundscapeId, projectId } = req.body;
  const userId = Number(req.user.id);

  try {
    const sprint = await groupSprintService.joinSprint(
      userId,
      Number(groupSprintId),
      checkin,
      startWords    != null ? Number(startWords)    : 0,
      soundscapeId  ? Number(soundscapeId)  : null,
      projectId     ? Number(projectId)     : null,   // ← new
    );

    notifyMemberCheckedIn({
      username:   req.user.username,
      startWords: startWords != null ? Number(startWords) : 0,
      groupSprintId: Number(groupSprintId),
    }).catch((err) => console.error("Discord member-checked-in notify failed:", err));

    res.status(201).json({ sprint });
  } catch (error) {
    console.error("Join sprint error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function botJoinSprint(req, res) {
  const { groupSprintId, startWords, soundscapeId, userId, username } = req.body;

  if (!userId || !groupSprintId) {
    return res.status(400).json({ message: "Missing userId or groupSprintId" });
  }

  try {
    const sprint = await groupSprintService.joinSprint(
      Number(userId),
      Number(groupSprintId),
      null,
      startWords   != null ? Number(startWords)   : 0,
      soundscapeId ? Number(soundscapeId) : null,
      null,   // bots don't link a project
    );

    res.status(201).json({ sprint });
  } catch (error) {
    console.error("Bot join sprint error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function checkoutSprint(req, res) {
  const sprintId = Number(req.params.sprintId);
  const { currentWordCount } = req.body;

  if (!sprintId || isNaN(sprintId)) {
    return res.status(400).json({ message: "Invalid sprint ID." });
  }

  try {
    const sprint = await groupSprintService.checkoutSprint(
      sprintId,
      currentWordCount != null ? Number(currentWordCount) : 0
    );

    const user    = req.user;
    const message = "Great job showing up and writing today. Every word counts 🌱";
    const link    = `https://inkwellinky.vercel.app/snippet`;
    await notifyUser(user, message, link);

    notifyMemberCheckedOut({
      username:     req.user.username,
      wordsWritten: sprint.wordsWritten,
      groupSprintId: sprint.groupSprintId,
    }).catch((err) => console.error("Discord member-checked-out notify failed:", err));

    if (sprint.groupSprint && !sprint.groupSprint.isActive) {
      notifyGroupSprintEnded({
        groupSprintId:     sprint.groupSprintId,
        totalWordsWritten: sprint.groupSprint.totalWordsWritten,
      }).catch((err) => console.error("Discord sprint-ended (auto) notify failed:", err));
    }

    res.status(200).json({ sprint });
  } catch (error) {
    console.error("Checkout sprint error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function fetchLoginUserSprint(req, res) {
  const userId = Number(req.user.id);
  try {
    const sprint = await groupSprintService.fetchLoginUserSprint(userId);
    res.status(200).json({ sprint });
  } catch (error) {
    console.error("Fetch user's sprint error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─── LIVEKIT TOKEN ────────────────────────────────────────────

async function getLiveKitToken(req, res) {
  const groupSprintId = Number(req.params.groupSprintId);

  try {
    const groupSprint = await groupSprintService.fetchGroupSprint(groupSprintId);

    if (!groupSprint) {
      return res.status(404).json({ message: "Group sprint not found" });
    }
    if (!groupSprint.liveKitRoomName) {
      return res.status(400).json({ message: "No LiveKit room found for this sprint" });
    }

    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      console.error("Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET in .env");
      return res.status(500).json({ message: "LiveKit is not configured on the server." });
    }

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity: req.user.username, ttl: "2h" }
    );

    at.addGrant({
      roomJoin:          true,
      room:              groupSprint.liveKitRoomName,
      canPublish:        true,
      canSubscribe:      true,
      canPublishSources: [TrackSource.SCREEN_SHARE],
    });

    const jwt = await at.toJwt();
    res.status(200).json({ token: jwt, roomName: groupSprint.liveKitRoomName });
  } catch (error) {
    console.error("LiveKit token error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

module.exports = {
  startGroupSprint,
  endGroupSprint,
  fetchGroupSprint,
  fetchAllActiveGroupSprints,
  fetchLastGroupSprint,
  joinSprint,
  botJoinSprint,
  checkoutSprint,
  fetchLoginUserSprint,
  getLiveKitToken,
};