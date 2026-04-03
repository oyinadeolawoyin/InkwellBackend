const prisma = require("../config/prismaClient");
const { uploadFile, deleteFile } = require("../utilis/fileUploader");

// ─── DB operations ────────────────────────────────────────────

// Any authenticated user contributes — goes into pending until admin approves
async function createSoundscape({ userId, name, creatorName, file }) {
  const fileUrl = await uploadFile(file); // reuses your existing fileUploader

  return prisma.soundscape.create({
    data: {
      name,
      creatorName: creatorName?.trim() || null,
      fileUrl,
      contributedBy: userId,
      isApproved: false, // pending until admin approves
    },
    include: {
      contributor: { select: { id: true, username: true, avatar: true } },
    },
  });
}

// Fetch only approved soundscapes — shown to members picking a sound for their sprint
async function fetchApprovedSoundscapes() {
  return prisma.soundscape.findMany({
    where: { isApproved: true },
    orderBy: { createdAt: "desc" },
    include: {
      contributor: { select: { id: true, username: true, avatar: true } },
    },
  });
}

// Fetch pending (not yet approved) — admin review page
async function fetchPendingSoundscapes() {
  return prisma.soundscape.findMany({
    where: { isApproved: false },
    orderBy: { createdAt: "desc" },
    include: {
      contributor: { select: { id: true, username: true, avatar: true } },
    },
  });
}

async function findSoundscape(soundscapeId) {
  return prisma.soundscape.findUnique({ where: { id: soundscapeId } });
}

// Admin approves a soundscape → goes live
async function approveSoundscape(soundscapeId) {
  return prisma.soundscape.update({
    where: { id: soundscapeId },
    data: { isApproved: true },
  });
}

// Delete — reuses your existing fileUploader deleteFile
async function deleteSoundscape(soundscapeId) {
  const existing = await prisma.soundscape.findUnique({
    where: { id: soundscapeId },
  });
  if (!existing) throw new Error("Soundscape not found");

  await prisma.soundscape.delete({ where: { id: soundscapeId } });
  await deleteFile(existing.fileUrl); // cleans up from Supabase too
}

module.exports = {
  createSoundscape,
  fetchApprovedSoundscapes,
  fetchPendingSoundscapes,
  findSoundscape,
  approveSoundscape,
  deleteSoundscape,
};