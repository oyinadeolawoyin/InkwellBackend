/*
  Warnings:

  - You are about to drop the column `postId` on the `BlogComment` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `BlogComment` table. All the data in the column will be lost.
  - You are about to drop the column `authorName` on the `BlogPost` table. All the data in the column will be lost.
  - You are about to drop the column `coverUrl` on the `BlogPost` table. All the data in the column will be lost.
  - You are about to drop the column `published` on the `BlogPost` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `BlogPostLike` table. All the data in the column will be lost.
  - You are about to drop the column `postId` on the `BlogPostLike` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `BlogReply` table. All the data in the column will be lost.
  - You are about to drop the column `currentStreak` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoggedDate` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `longestStreak` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `phase` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `streakBrokenAt` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `streakGoal` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `trackerType` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `author` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `QuoteLike` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SnippetCommentLike` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SnippetLike` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SnippetReplyLike` table. All the data in the column will be lost.
  - You are about to drop the column `postId` on the `WallPostComment` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `WallPostLike` table. All the data in the column will be lost.
  - You are about to drop the column `postId` on the `WallPostLike` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `WritingSnippet` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `WritingSnippet` table. All the data in the column will be lost.
  - You are about to drop the column `sprintId` on the `WritingSnippet` table. All the data in the column will be lost.
  - You are about to drop the `EventParticipation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectDailyLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WritingEvent` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,blogPostId]` on the table `BlogPostLike` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,wallPostId]` on the table `WallPostLike` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `authorId` to the `BlogComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blogPostId` to the `BlogComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blogPostId` to the `BlogPostLike` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authorId` to the `BlogReply` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wallPostId` to the `WallPostComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wallPostId` to the `WallPostLike` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BlogComment" DROP CONSTRAINT "BlogComment_postId_fkey";

-- DropForeignKey
ALTER TABLE "BlogComment" DROP CONSTRAINT "BlogComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "BlogPostLike" DROP CONSTRAINT "BlogPostLike_postId_fkey";

-- DropForeignKey
ALTER TABLE "BlogReply" DROP CONSTRAINT "BlogReply_userId_fkey";

-- DropForeignKey
ALTER TABLE "EventParticipation" DROP CONSTRAINT "EventParticipation_eventId_fkey";

-- DropForeignKey
ALTER TABLE "EventParticipation" DROP CONSTRAINT "EventParticipation_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectDailyLog" DROP CONSTRAINT "ProjectDailyLog_projectId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteLike" DROP CONSTRAINT "QuoteLike_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteLike" DROP CONSTRAINT "QuoteLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "WallPostComment" DROP CONSTRAINT "WallPostComment_postId_fkey";

-- DropForeignKey
ALTER TABLE "WallPostLike" DROP CONSTRAINT "WallPostLike_postId_fkey";

-- DropIndex
DROP INDEX "BlogComment_postId_idx";

-- DropIndex
DROP INDEX "BlogPost_published_idx";

-- DropIndex
DROP INDEX "BlogPostLike_postId_idx";

-- DropIndex
DROP INDEX "BlogPostLike_userId_postId_key";

-- DropIndex
DROP INDEX "Quote_createdAt_idx";

-- DropIndex
DROP INDEX "QuoteLike_quoteId_idx";

-- DropIndex
DROP INDEX "WallPostComment_postId_idx";

-- DropIndex
DROP INDEX "WallPostLike_postId_idx";

-- DropIndex
DROP INDEX "WallPostLike_userId_postId_key";

-- AlterTable
ALTER TABLE "BlogComment" DROP COLUMN "postId",
DROP COLUMN "userId",
ADD COLUMN     "authorId" INTEGER NOT NULL,
ADD COLUMN     "blogPostId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "BlogPost" DROP COLUMN "authorName",
DROP COLUMN "coverUrl",
DROP COLUMN "published",
ADD COLUMN     "link" TEXT,
ADD COLUMN     "mediaUrl" TEXT,
ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable
ALTER TABLE "BlogPostLike" DROP COLUMN "createdAt",
DROP COLUMN "postId",
ADD COLUMN     "blogPostId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "BlogReply" DROP COLUMN "userId",
ADD COLUMN     "authorId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "message" DROP NOT NULL,
ALTER COLUMN "link" DROP NOT NULL,
ALTER COLUMN "read" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "currentStreak",
DROP COLUMN "lastLoggedDate",
DROP COLUMN "longestStreak",
DROP COLUMN "phase",
DROP COLUMN "streakBrokenAt",
DROP COLUMN "streakGoal",
DROP COLUMN "trackerType";

-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "author",
DROP COLUMN "category",
DROP COLUMN "text",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "QuoteLike" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "SnippetCommentLike" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "SnippetLike" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "SnippetReplyLike" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "WallPostComment" DROP COLUMN "postId",
ADD COLUMN     "wallPostId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "WallPostLike" DROP COLUMN "createdAt",
DROP COLUMN "postId",
ADD COLUMN     "wallPostId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "WritingSnippet" DROP COLUMN "content",
DROP COLUMN "source",
DROP COLUMN "sprintId",
ADD COLUMN     "context" TEXT,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "sourceType" "SnippetSource" NOT NULL DEFAULT 'POST_SPRINT',
ADD COLUMN     "tags" TEXT;

-- DropTable
DROP TABLE "EventParticipation";

-- DropTable
DROP TABLE "ProjectDailyLog";

-- DropTable
DROP TABLE "WritingEvent";

-- DropEnum
DROP TYPE "TrackerType";

-- DropEnum
DROP TYPE "WritingPhase";

-- CreateTable
CREATE TABLE "WeeklySchedule" (
    "id" SERIAL NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledSession" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "label" TEXT,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySchedule_weekStart_key" ON "WeeklySchedule"("weekStart");

-- CreateIndex
CREATE INDEX "WeeklySchedule_weekStart_idx" ON "WeeklySchedule"("weekStart");

-- CreateIndex
CREATE INDEX "WeeklySchedule_isActive_idx" ON "WeeklySchedule"("isActive");

-- CreateIndex
CREATE INDEX "ScheduledSession_scheduleId_idx" ON "ScheduledSession"("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduledSession_dayOfWeek_idx" ON "ScheduledSession"("dayOfWeek");

-- CreateIndex
CREATE INDEX "ScheduledSession_isDone_idx" ON "ScheduledSession"("isDone");

-- CreateIndex
CREATE INDEX "BlogComment_blogPostId_idx" ON "BlogComment"("blogPostId");

-- CreateIndex
CREATE INDEX "BlogComment_authorId_idx" ON "BlogComment"("authorId");

-- CreateIndex
CREATE INDEX "BlogPostLike_blogPostId_idx" ON "BlogPostLike"("blogPostId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPostLike_userId_blogPostId_key" ON "BlogPostLike"("userId", "blogPostId");

-- CreateIndex
CREATE INDEX "BlogReply_authorId_idx" ON "BlogReply"("authorId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "SnippetComment_userId_idx" ON "SnippetComment"("userId");

-- CreateIndex
CREATE INDEX "SnippetReply_userId_idx" ON "SnippetReply"("userId");

-- CreateIndex
CREATE INDEX "WallPostComment_wallPostId_idx" ON "WallPostComment"("wallPostId");

-- CreateIndex
CREATE INDEX "WallPostComment_userId_idx" ON "WallPostComment"("userId");

-- CreateIndex
CREATE INDEX "WallPostLike_wallPostId_idx" ON "WallPostLike"("wallPostId");

-- CreateIndex
CREATE UNIQUE INDEX "WallPostLike_userId_wallPostId_key" ON "WallPostLike"("userId", "wallPostId");

-- AddForeignKey
ALTER TABLE "ScheduledSession" ADD CONSTRAINT "ScheduledSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WeeklySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLike" ADD CONSTRAINT "QuoteLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLike" ADD CONSTRAINT "QuoteLike_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogReply" ADD CONSTRAINT "BlogReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPostLike" ADD CONSTRAINT "WallPostLike_wallPostId_fkey" FOREIGN KEY ("wallPostId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPostComment" ADD CONSTRAINT "WallPostComment_wallPostId_fkey" FOREIGN KEY ("wallPostId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
