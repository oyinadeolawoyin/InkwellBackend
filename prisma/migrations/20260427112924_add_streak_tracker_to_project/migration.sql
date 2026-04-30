/*
  Warnings:

  - You are about to drop the column `authorId` on the `BlogComment` table. All the data in the column will be lost.
  - You are about to drop the column `blogPostId` on the `BlogComment` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `BlogPost` table. All the data in the column will be lost.
  - You are about to drop the column `mediaUrl` on the `BlogPost` table. All the data in the column will be lost.
  - You are about to drop the column `blogPostId` on the `BlogPostLike` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `BlogReply` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `wallPostId` on the `WallPostComment` table. All the data in the column will be lost.
  - You are about to drop the column `wallPostId` on the `WallPostLike` table. All the data in the column will be lost.
  - You are about to drop the column `context` on the `WritingSnippet` table. All the data in the column will be lost.
  - You are about to drop the column `mediaUrl` on the `WritingSnippet` table. All the data in the column will be lost.
  - You are about to drop the column `sourceType` on the `WritingSnippet` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `WritingSnippet` table. All the data in the column will be lost.
  - You are about to drop the `ScheduledSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeeklySchedule` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,postId]` on the table `BlogPostLike` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,postId]` on the table `WallPostLike` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `postId` to the `BlogComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `BlogComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authorName` to the `BlogPost` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `BlogPost` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `postId` to the `BlogPostLike` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `BlogReply` table without a default value. This is not possible if the table is not empty.
  - Made the column `message` on table `Notification` required. This step will fail if there are existing NULL values in that column.
  - Made the column `link` on table `Notification` required. This step will fail if there are existing NULL values in that column.
  - Made the column `read` on table `Notification` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `text` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postId` to the `WallPostComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postId` to the `WallPostLike` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content` to the `WritingSnippet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `WritingSnippet` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TrackerType" AS ENUM ('WORD_COUNT', 'CHAPTERS', 'SCENES', 'SESSIONS', 'STREAK');

-- CreateEnum
CREATE TYPE "WritingPhase" AS ENUM ('BRAINSTORMING', 'PLANNING', 'DRAFTING', 'EDITING');

-- DropForeignKey
ALTER TABLE "BlogComment" DROP CONSTRAINT "BlogComment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "BlogComment" DROP CONSTRAINT "BlogComment_blogPostId_fkey";

-- DropForeignKey
ALTER TABLE "BlogPostLike" DROP CONSTRAINT "BlogPostLike_blogPostId_fkey";

-- DropForeignKey
ALTER TABLE "BlogReply" DROP CONSTRAINT "BlogReply_authorId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteLike" DROP CONSTRAINT "QuoteLike_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteLike" DROP CONSTRAINT "QuoteLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduledSession" DROP CONSTRAINT "ScheduledSession_scheduleId_fkey";

-- DropForeignKey
ALTER TABLE "WallPostComment" DROP CONSTRAINT "WallPostComment_wallPostId_fkey";

-- DropForeignKey
ALTER TABLE "WallPostLike" DROP CONSTRAINT "WallPostLike_wallPostId_fkey";

-- DropIndex
DROP INDEX "BlogComment_authorId_idx";

-- DropIndex
DROP INDEX "BlogComment_blogPostId_idx";

-- DropIndex
DROP INDEX "BlogPostLike_blogPostId_idx";

-- DropIndex
DROP INDEX "BlogPostLike_userId_blogPostId_key";

-- DropIndex
DROP INDEX "BlogReply_authorId_idx";

-- DropIndex
DROP INDEX "Notification_userId_read_idx";

-- DropIndex
DROP INDEX "SnippetComment_userId_idx";

-- DropIndex
DROP INDEX "SnippetReply_userId_idx";

-- DropIndex
DROP INDEX "WallPostComment_userId_idx";

-- DropIndex
DROP INDEX "WallPostComment_wallPostId_idx";

-- DropIndex
DROP INDEX "WallPostLike_userId_wallPostId_key";

-- DropIndex
DROP INDEX "WallPostLike_wallPostId_idx";

-- AlterTable
ALTER TABLE "BlogComment" DROP COLUMN "authorId",
DROP COLUMN "blogPostId",
ADD COLUMN     "postId" INTEGER NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "BlogPost" DROP COLUMN "link",
DROP COLUMN "mediaUrl",
ADD COLUMN     "authorName" TEXT NOT NULL,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "title" SET NOT NULL;

-- AlterTable
ALTER TABLE "BlogPostLike" DROP COLUMN "blogPostId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "postId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "BlogReply" DROP COLUMN "authorId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "message" SET NOT NULL,
ALTER COLUMN "link" SET NOT NULL,
ALTER COLUMN "read" SET NOT NULL;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoggedDate" TIMESTAMP(3),
ADD COLUMN     "longestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phase" "WritingPhase" NOT NULL DEFAULT 'DRAFTING',
ADD COLUMN     "streakBrokenAt" TIMESTAMP(3),
ADD COLUMN     "streakGoal" INTEGER,
ADD COLUMN     "trackerType" "TrackerType" NOT NULL DEFAULT 'WORD_COUNT';

-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "content",
DROP COLUMN "title",
ADD COLUMN     "author" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "text" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QuoteLike" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SnippetCommentLike" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SnippetLike" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SnippetReplyLike" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "WallPostComment" DROP COLUMN "wallPostId",
ADD COLUMN     "postId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "WallPostLike" DROP COLUMN "wallPostId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "postId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "WritingSnippet" DROP COLUMN "context",
DROP COLUMN "mediaUrl",
DROP COLUMN "sourceType",
DROP COLUMN "tags",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "source" "SnippetSource" NOT NULL,
ADD COLUMN     "sprintId" INTEGER;

-- DropTable
DROP TABLE "ScheduledSession";

-- DropTable
DROP TABLE "WeeklySchedule";

-- CreateTable
CREATE TABLE "ProjectDailyLog" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "wordsAdded" INTEGER NOT NULL DEFAULT 0,
    "chaptersAdded" INTEGER NOT NULL DEFAULT 0,
    "scenesAdded" INTEGER NOT NULL DEFAULT 0,
    "sessionsAdded" INTEGER NOT NULL DEFAULT 0,
    "dayLogged" BOOLEAN NOT NULL DEFAULT true,
    "streakAtLog" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectDailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationDays" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipation" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "EventParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDailyLog_projectId_idx" ON "ProjectDailyLog"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDailyLog_logDate_idx" ON "ProjectDailyLog"("logDate");

-- CreateIndex
CREATE INDEX "ProjectDailyLog_userId_idx" ON "ProjectDailyLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDailyLog_projectId_logDate_key" ON "ProjectDailyLog"("projectId", "logDate");

-- CreateIndex
CREATE INDEX "WritingEvent_isActive_idx" ON "WritingEvent"("isActive");

-- CreateIndex
CREATE INDEX "WritingEvent_startDate_idx" ON "WritingEvent"("startDate");

-- CreateIndex
CREATE INDEX "EventParticipation_eventId_idx" ON "EventParticipation"("eventId");

-- CreateIndex
CREATE INDEX "EventParticipation_projectId_idx" ON "EventParticipation"("projectId");

-- CreateIndex
CREATE INDEX "EventParticipation_userId_idx" ON "EventParticipation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipation_eventId_projectId_key" ON "EventParticipation"("eventId", "projectId");

-- CreateIndex
CREATE INDEX "BlogComment_postId_idx" ON "BlogComment"("postId");

-- CreateIndex
CREATE INDEX "BlogPost_published_idx" ON "BlogPost"("published");

-- CreateIndex
CREATE INDEX "BlogPostLike_postId_idx" ON "BlogPostLike"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPostLike_userId_postId_key" ON "BlogPostLike"("userId", "postId");

-- CreateIndex
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");

-- CreateIndex
CREATE INDEX "QuoteLike_quoteId_idx" ON "QuoteLike"("quoteId");

-- CreateIndex
CREATE INDEX "WallPostComment_postId_idx" ON "WallPostComment"("postId");

-- CreateIndex
CREATE INDEX "WallPostLike_postId_idx" ON "WallPostLike"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "WallPostLike_userId_postId_key" ON "WallPostLike"("userId", "postId");

-- AddForeignKey
ALTER TABLE "ProjectDailyLog" ADD CONSTRAINT "ProjectDailyLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WritingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLike" ADD CONSTRAINT "QuoteLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLike" ADD CONSTRAINT "QuoteLike_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogReply" ADD CONSTRAINT "BlogReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPostLike" ADD CONSTRAINT "WallPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPostComment" ADD CONSTRAINT "WallPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
