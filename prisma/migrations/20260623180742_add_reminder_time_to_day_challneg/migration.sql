-- AlterTable
ALTER TABLE "DaysChallenge" ADD COLUMN     "reminderTime" TEXT NOT NULL DEFAULT '09:00',
ADD COLUMN     "reminderTimeUTC" TEXT NOT NULL DEFAULT '09:00';

-- CreateIndex
CREATE INDEX "DaysChallenge_reminderTimeUTC_status_idx" ON "DaysChallenge"("reminderTimeUTC", "status");
