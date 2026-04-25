// src/services/pointService.js
const prisma = require("../config/prismaClient");

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BOOTSTRAP_FREE_SLOTS = 3;   // first 3 unique users to post get a free pass (was 5)
const NEW_MEMBER_SEED      = 5;   // posting pts every new member starts with

// Points earned per critique = 5 pts per 500 words
// Same value doubles as the posting cost — you pay what you'd earn by critiquing.
const TIER_COSTS = {
  TIER_1000: 10,   // 1000 words → 2 × 500 = 10 pts
  TIER_2000: 20,   // 2000 words → 4 × 500 = 20 pts
  TIER_3000: 30,   // 3000 words → 6 × 500 = 30 pts
  TIER_4000: 40,   // 4000 words → 8 × 500 = 40 pts
};

// Full-critique upvote: flat +3 pts per upvote (posting balance + reputation)
const CRITIQUE_UPVOTE_BONUS = 3;

// Paragraph comment upvotes: milestone-based — 1 pt per every 2 upvotes
// e.g. 2 upvotes → 1 pt, 4 upvotes → 2 pts, 6 upvotes → 3 pts
const PARAGRAPH_UPVOTE_MILESTONE    = 2;
const PARAGRAPH_UPVOTE_PER_MILESTONE = 1;

// Reputation tiers
const TIERS = [
  { name: "Bronze",   min: 0,    max: 99,       gem: "B", color: "#C87533" },
  { name: "Silver",   min: 100,  max: 299,      gem: "S", color: "#9EA3A8" },
  { name: "Gold",     min: 300,  max: 699,      gem: "G", color: "#D4A017" },
  { name: "Platinum", min: 700,  max: 1499,     gem: "P", color: "#7F77DD" },
  { name: "Diamond",  min: 1500, max: Infinity,  gem: "D", color: "#D85A30" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getTier(reputation) {
  return TIERS.find((t) => reputation >= t.min && reputation <= t.max) ?? TIERS[0];
}

function getTierCost(wordCountTier) {
  const cost = TIER_COSTS[wordCountTier];
  if (!cost) throw new Error(`Unknown word count tier: ${wordCountTier}`);
  return cost;
}

// Returns the new tier name if reputation crossed a tier boundary, else null.
function detectTierChange(oldReputation, newReputation) {
  const oldTier = getTier(oldReputation);
  const newTier = getTier(newReputation);
  return oldTier.name !== newTier.name ? newTier : null;
}

// ─── WALLET INIT ─────────────────────────────────────────────────────────────

async function initWallet(userId) {
  return prisma.feedbackPoint.upsert({
    where:  { userId },
    update: {},
    // reputation starts at 0 — only upvotes build reputation, not seed pts
    create: { userId, postingBalance: NEW_MEMBER_SEED, reputation: 0 },
  });
}

// ─── GET WALLET ──────────────────────────────────────────────────────────────

async function getWallet(userId) {
  let wallet = await prisma.feedbackPoint.findUnique({ where: { userId } });
  if (!wallet) wallet = await initWallet(userId);

  // Check if this user can still claim a free post.
  // Both conditions must be true:
  //   1. The user hasn't used their personal free post yet
  //   2. The global bootstrap pool still has slots available
  let freePostAvailable = false;
  if (!wallet.usedFreePost) {
    const bootstrap = await prisma.feedbackHubBootstrap.findUnique({ where: { id: 1 } });
    const posterCount = bootstrap?.posterCount ?? 0;
    freePostAvailable = posterCount < BOOTSTRAP_FREE_SLOTS;
  }

  return { ...wallet, tier: getTier(wallet.reputation), TIER_COSTS, freePostAvailable };
}

// ─── BOOTSTRAP CHECK ─────────────────────────────────────────────────────────
// Returns true if this user qualifies for a free first post.
// Conditions:
//   1. The global bootstrap counter is still under BOOTSTRAP_FREE_SLOTS (3)
//   2. This specific user has never used their free post

async function checkAndClaimFreePost(userId, tx = prisma) {
  let bootstrap = await tx.feedbackHubBootstrap.findUnique({ where: { id: 1 } });
  if (!bootstrap) {
    bootstrap = await tx.feedbackHubBootstrap.create({ data: { id: 1, posterCount: 0 } });
  }

  if (bootstrap.posterCount >= BOOTSTRAP_FREE_SLOTS) return false;

  const wallet = await tx.feedbackPoint.findUnique({ where: { userId } });
  if (!wallet || wallet.usedFreePost) return false;

  await tx.feedbackHubBootstrap.update({
    where: { id: 1 },
    data:  { posterCount: { increment: 1 } },
  });
  await tx.feedbackPoint.update({
    where: { userId },
    data:  { usedFreePost: true },
  });

  return true;
}

// ─── DEDUCT POSTING COST ─────────────────────────────────────────────────────

async function deductPostingCost(userId, wordCountTier, tx = prisma) {
  const cost   = getTierCost(wordCountTier);
  const wallet = await tx.feedbackPoint.findUnique({ where: { userId } });
  if (!wallet) throw new Error("Wallet not found. User may not be initialised.");
  if (wallet.postingBalance < cost) {
    throw new Error(
      `Not enough points. You need ${cost} pts to post at this tier but only have ${wallet.postingBalance}.`
    );
  }
  return tx.feedbackPoint.update({
    where: { userId },
    data:  { postingBalance: { decrement: cost } },
  });
}

// ─── AWARD CRITIQUE POINTS ───────────────────────────────────────────────────
// Called when a critic submits a FeedbackResponse.
// ONLY postingBalance increases — reputation is NOT touched.
// Reputation is built exclusively through upvotes received.

async function awardCritiquePoints(criticId, wordCountTier, tx = prisma) {
  const earned = getTierCost(wordCountTier);
  return tx.feedbackPoint.upsert({
    where:  { userId: criticId },
    update: {
      postingBalance: { increment: earned },
      // ⚠ reputation intentionally NOT incremented here
    },
    create: {
      userId:         criticId,
      postingBalance: NEW_MEMBER_SEED + earned,
      reputation:     0,
    },
  });
}

// ─── CRITIQUE UPVOTE BONUS ───────────────────────────────────────────────────
// Flat +3 to BOTH postingBalance AND reputation per upvote on a full critique.

async function awardCritiqueUpvoteBonus(recipientId, tx = prisma) {
  return tx.feedbackPoint.upsert({
    where:  { userId: recipientId },
    update: {
      postingBalance: { increment: CRITIQUE_UPVOTE_BONUS },
      reputation:     { increment: CRITIQUE_UPVOTE_BONUS },
    },
    create: {
      userId:         recipientId,
      postingBalance: NEW_MEMBER_SEED + CRITIQUE_UPVOTE_BONUS,
      reputation:     CRITIQUE_UPVOTE_BONUS,
    },
  });
}

// Un-upvoting a critique: rolls back postingBalance only — reputation is never decremented.
async function reverseCritiqueUpvoteBonus(recipientId, tx = prisma) {
  return tx.feedbackPoint.update({
    where: { userId: recipientId },
    data:  { postingBalance: { decrement: CRITIQUE_UPVOTE_BONUS } },
  });
}

// ─── PARAGRAPH COMMENT UPVOTE MILESTONES ─────────────────────────────────────
// Awards 1 pt per every 2 upvotes on a paragraph comment (milestone-based).
// Called AFTER the new upvote record is saved, so newUpvoteTotal is the fresh count.
// Both postingBalance AND reputation increase (it's still an upvote reward).
//
// Returns: { awarded: boolean, pointsAwarded: number }

async function checkAndAwardParagraphUpvoteMilestone(commentAuthorId, newUpvoteTotal, tx = prisma) {
  const prevTotal      = newUpvoteTotal - 1;
  const prevMilestones = Math.floor(prevTotal      / PARAGRAPH_UPVOTE_MILESTONE);
  const newMilestones  = Math.floor(newUpvoteTotal / PARAGRAPH_UPVOTE_MILESTONE);
  const milestonesHit  = newMilestones - prevMilestones;

  if (milestonesHit <= 0) return { awarded: false, pointsAwarded: 0 };

  const pts = milestonesHit * PARAGRAPH_UPVOTE_PER_MILESTONE;
  await tx.feedbackPoint.upsert({
    where:  { userId: commentAuthorId },
    update: {
      postingBalance: { increment: pts },
      reputation:     { increment: pts },
    },
    create: {
      userId:         commentAuthorId,
      postingBalance: NEW_MEMBER_SEED + pts,
      reputation:     pts,
    },
  });

  return { awarded: true, pointsAwarded: pts };
}

// Un-upvoting a paragraph comment: reverses postingBalance if a milestone is lost.
// Reputation is NEVER decremented.
// Returns: { reversed: boolean, pointsDeducted: number }

async function checkAndReverseParagraphUpvoteMilestone(commentAuthorId, newUpvoteTotal, tx = prisma) {
  const prevTotal      = newUpvoteTotal + 1;
  const prevMilestones = Math.floor(prevTotal      / PARAGRAPH_UPVOTE_MILESTONE);
  const newMilestones  = Math.floor(newUpvoteTotal / PARAGRAPH_UPVOTE_MILESTONE);
  const milestonesLost = prevMilestones - newMilestones;

  if (milestonesLost <= 0) return { reversed: false, pointsDeducted: 0 };

  const pts = milestonesLost * PARAGRAPH_UPVOTE_PER_MILESTONE;
  await tx.feedbackPoint.update({
    where: { userId: commentAuthorId },
    data:  { postingBalance: { decrement: pts } },
  });

  return { reversed: true, pointsDeducted: pts };
}

module.exports = {
  TIER_COSTS,
  CRITIQUE_UPVOTE_BONUS,
  PARAGRAPH_UPVOTE_MILESTONE,
  PARAGRAPH_UPVOTE_PER_MILESTONE,
  BOOTSTRAP_FREE_SLOTS,
  TIERS,
  getTier,
  getTierCost,
  detectTierChange,
  initWallet,
  getWallet,
  checkAndClaimFreePost,
  deductPostingCost,
  awardCritiquePoints,
  awardCritiqueUpvoteBonus,
  reverseCritiqueUpvoteBonus,
  checkAndAwardParagraphUpvoteMilestone,
  checkAndReverseParagraphUpvoteMilestone,
};