const cron   = require('node-cron');
const prisma = require('../src/config/prismaClient');
const { notifyUser } = require('../src/services/notificationService');

async function publishDailyEmotion() {
  const todayUTC = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  };

  const today = todayUTC();

  // Skip if already published today
  const existing = await prisma.emotionEntry.findUnique({ where: { scheduledAt: today } });
  if (existing) {
    console.log('[EmotionCron] Already published for today.');
    return;
  }

  // Find the most recent EmotionEntry to know where we are in the cycle
  const lastEntry = await prisma.emotionEntry.findFirst({
    orderBy: { scheduledAt: 'desc' },
    include: { /* we need to know which template was used */ },
  });

  // Count total templates
  const totalTemplates = await prisma.emotionTemplate.count();
  if (totalTemplates === 0) throw new Error('No emotion templates seeded.');

  // Determine next sortOrder — we need to track which template was last used.
  // Simplest: store lastUsedSortOrder on a config row, or derive it from entry count.
  // We'll use entry count mod totalTemplates:
  const entryCount = await prisma.emotionEntry.count();
  const nextSortOrder = (entryCount % totalTemplates) + 1;

  const template = await prisma.emotionTemplate.findUnique({
    where: { sortOrder: nextSortOrder },
  });

  if (!template) throw new Error(`No template at sortOrder ${nextSortOrder}`);

  // Create today's entry
  const entry = await prisma.emotionEntry.create({
    data: {
      emotion:     template.emotion,
      cues:        template.cues,
      scheduledAt: today,
    },
  });

  console.log(`[EmotionCron] Published: ${entry.emotion} (template #${nextSortOrder})`);

  // Notify all users who accept emotion_new notifications
  // Fetch users who have push/inbox/email enabled for emotion_new
  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    select: { id: true, username: true, email: true },
  });

  const link    = '/emotions/practice'; // adjust to your frontend route
  const message = `Today's emotion is "${entry.emotion}" — write a practice sentence!`;

  for (const user of users) {
    try {
      await notifyUser(user, message, link, 'emotion_new');
    } catch (err) {
      console.error(`[EmotionCron] Failed to notify user ${user.id}:`, err.message);
    }
  }

  console.log(`[EmotionCron] Notified ${users.length} users.`);
}

// Schedule: every day at midnight UTC
cron.schedule('0 0 * * *', () => {
  console.log('[EmotionCron] Running daily emotion job...');
  publishDailyEmotion().catch(console.error);
}, { timezone: 'UTC' });

module.exports = { publishDailyEmotion }; // export for manual trigger if needed