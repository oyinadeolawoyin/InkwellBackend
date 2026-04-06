const prisma = require("../config/prismaClient");

// ─── Bot upsert — finds or creates a Discord-linked Inkwell account ───────────

async function botUpsertUser(req, res) {
  const { discordId, username } = req.body;

  if (!discordId || !username) {
    return res.status(400).json({ message: "discordId and username are required." });
  }

  try {
    // 1. Already linked — return immediately, no changes needed
    const linkedUser = await prisma.user.findUnique({ where: { discordId } });
    if (linkedUser) return res.json({ user: linkedUser, isNew: false });

    // 2. Site user with same username but no Discord linked yet — prompt them to link
    const siteUser = await prisma.user.findUnique({ where: { username } });
    if (siteUser && !siteUser.discordId) {
      return res.status(409).json({
        message: "LINK_REQUIRED",
        hint: "An Inkwell account with this username exists. Link your Discord in settings.",
      });
    }

    // 3. Username taken by a different Discord user — make it safe
    const safeUsername = siteUser ? `${username}_${discordId.slice(-4)}` : username;

    // 4. Brand new — create a Discord-only account
    const user = await prisma.user.create({
      data: {
        discordId,
        username: safeUsername,
        createdVia: "discord",
      },
    });

    res.status(201).json({ user, isNew: true });
  } catch (error) {
    console.error("Bot upsert error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
}

// ─── Link Discord — existing site user pastes their Discord ID in settings ───

async function linkDiscord(req, res) {
  const { discordId } = req.body;

  if (!discordId) {
    return res.status(400).json({ message: "discordId is required." });
  }

  try {
    // Make sure nobody else has claimed this Discord ID
    const already = await prisma.user.findUnique({ where: { discordId } });
    if (already && already.id !== req.user.id) {
      return res.status(409).json({
        message: "This Discord account is already linked to another Inkwell account.",
      });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { discordId },
      select: { id: true, username: true, email: true, discordId: true, role: true },
    });

    res.json({ user });
  } catch (error) {
    console.error("Link discord error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
}

// ─── Unlink Discord — user removes their Discord link from settings ───────────

async function unlinkDiscord(req, res) {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { discordId: null },
      select: { id: true, username: true, email: true, discordId: true, role: true },
    });

    res.json({ user });
  } catch (error) {
    console.error("Unlink discord error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
}

module.exports = { botUpsertUser, linkDiscord, unlinkDiscord };