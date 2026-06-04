/*
  Warnings:

  - You are about to drop the `ScheduledSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeeklySchedule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ScheduledSession" DROP CONSTRAINT "ScheduledSession_scheduleId_fkey";

-- AlterTable
ALTER TABLE "FeedbackSubmission" ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unpublishedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "ScheduledSession";

-- DropTable
DROP TABLE "WeeklySchedule";

-- CreateTable
CREATE TABLE "WritingDraft" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "sourceSubmissionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WritingDraft_sourceSubmissionId_key" ON "WritingDraft"("sourceSubmissionId");

-- CreateIndex
CREATE INDEX "WritingDraft_userId_idx" ON "WritingDraft"("userId");

-- CreateIndex
CREATE INDEX "WritingDraft_createdAt_idx" ON "WritingDraft"("createdAt");

-- AddForeignKey
ALTER TABLE "WritingDraft" ADD CONSTRAINT "WritingDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingDraft" ADD CONSTRAINT "WritingDraft_sourceSubmissionId_fkey" FOREIGN KEY ("sourceSubmissionId") REFERENCES "FeedbackSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
