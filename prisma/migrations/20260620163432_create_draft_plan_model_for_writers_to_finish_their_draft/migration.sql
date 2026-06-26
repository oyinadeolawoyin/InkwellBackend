/*
  Warnings:

  - You are about to drop the `SnippetComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SnippetCommentLike` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SnippetLike` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SnippetReply` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SnippetReplyLike` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WritingSnippet` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DraftGoalType" AS ENUM ('WORDS', 'CHAPTERS', 'SCENES');

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "DaysChallengeDuration" AS ENUM ('SEVEN', 'FIFTEEN');

-- CreateEnum
CREATE TYPE "DaysChallengeGoalType" AS ENUM ('WORDS', 'DURATION');

-- CreateEnum
CREATE TYPE "DaysChallengeStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DaysChallengeFocus" AS ENUM ('OUTLINING', 'BRAINSTORMING', 'EDITING', 'STORY_DEVELOPMENT');

-- DropForeignKey
ALTER TABLE "SnippetComment" DROP CONSTRAINT "SnippetComment_snippetId_fkey";

-- DropForeignKey
ALTER TABLE "SnippetComment" DROP CONSTRAINT "SnippetComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "SnippetCommentLike" DROP CONSTRAINT "SnippetCommentLike_commentId_fkey";

-- DropForeignKey
ALTER TABLE "SnippetCommentLike" DROP CONSTRAINT "SnippetCommentLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "SnippetLike" DROP CONSTRAINT "SnippetLike_snippetId_fkey";

-- DropForeignKey
ALTER TABLE "SnippetLike" DROP CONSTRAINT "SnippetLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "SnippetReply" DROP CONSTRAINT "SnippetReply_commentId_fkey";

-- DropForeignKey
ALTER TABLE "SnippetReply" DROP CONSTRAINT "SnippetReply_userId_fkey";

-- DropForeignKey
ALTER TABLE "SnippetReplyLike" DROP CONSTRAINT "SnippetReplyLike_replyId_fkey";

-- DropForeignKey
ALTER TABLE "SnippetReplyLike" DROP CONSTRAINT "SnippetReplyLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "WritingSnippet" DROP CONSTRAINT "WritingSnippet_userId_fkey";

-- DropTable
DROP TABLE "SnippetComment";

-- DropTable
DROP TABLE "SnippetCommentLike";

-- DropTable
DROP TABLE "SnippetLike";

-- DropTable
DROP TABLE "SnippetReply";

-- DropTable
DROP TABLE "SnippetReplyLike";

-- DropTable
DROP TABLE "WritingSnippet";

-- DropEnum
DROP TYPE "SnippetSource";

-- CreateTable
CREATE TABLE "DraftPlan" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "storyTitle" TEXT NOT NULL,
    "premise" TEXT NOT NULL,
    "wordsWrittenSoFar" INTEGER NOT NULL,
    "targetLength" INTEGER NOT NULL,
    "goalType" "DraftGoalType" NOT NULL,
    "dailyGoal" INTEGER NOT NULL,
    "whyFinish" TEXT NOT NULL,
    "whatItMeans" TEXT NOT NULL,
    "dailyTreat" TEXT NOT NULL,
    "weeklyTreat" TEXT NOT NULL,
    "inspirationSource" TEXT NOT NULL,
    "moodboardImages" JSONB NOT NULL DEFAULT '[]',
    "estimatedDays" INTEGER NOT NULL,
    "weeklyGoal" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPlanCharacter" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "DraftPlanCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftProgressLog" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "countLogged" INTEGER NOT NULL,
    "metDailyGoal" BOOLEAN NOT NULL DEFAULT false,
    "totalSoFar" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftWritingDay" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "day" "WeekDay" NOT NULL,
    "reminderTime" TEXT NOT NULL,
    "reminderTimeUTC" TEXT NOT NULL,

    CONSTRAINT "DraftWritingDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DaysChallenge" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "duration" "DaysChallengeDuration" NOT NULL,
    "storyTitle" TEXT,
    "workingGoal" TEXT NOT NULL,
    "whyNow" TEXT NOT NULL,
    "goalType" "DaysChallengeGoalType" NOT NULL,
    "dailyGoal" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "status" "DaysChallengeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DaysChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DaysChallengesFocus" (
    "id" SERIAL NOT NULL,
    "challengeId" INTEGER NOT NULL,
    "focus" "DaysChallengeFocus" NOT NULL,

    CONSTRAINT "DaysChallengesFocus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DaysChallengeCheckIn" (
    "id" SERIAL NOT NULL,
    "challengeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "countLogged" INTEGER NOT NULL,
    "metDailyGoal" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DaysChallengeCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DraftPlan_userId_key" ON "DraftPlan"("userId");

-- CreateIndex
CREATE INDEX "DraftPlan_userId_idx" ON "DraftPlan"("userId");

-- CreateIndex
CREATE INDEX "DraftPlan_isCompleted_idx" ON "DraftPlan"("isCompleted");

-- CreateIndex
CREATE INDEX "DraftPlan_createdAt_idx" ON "DraftPlan"("createdAt");

-- CreateIndex
CREATE INDEX "DraftPlanCharacter_planId_idx" ON "DraftPlanCharacter"("planId");

-- CreateIndex
CREATE INDEX "DraftProgressLog_planId_idx" ON "DraftProgressLog"("planId");

-- CreateIndex
CREATE INDEX "DraftProgressLog_userId_idx" ON "DraftProgressLog"("userId");

-- CreateIndex
CREATE INDEX "DraftProgressLog_logDate_idx" ON "DraftProgressLog"("logDate");

-- CreateIndex
CREATE UNIQUE INDEX "DraftProgressLog_planId_logDate_key" ON "DraftProgressLog"("planId", "logDate");

-- CreateIndex
CREATE INDEX "DraftWritingDay_planId_idx" ON "DraftWritingDay"("planId");

-- CreateIndex
CREATE INDEX "DraftWritingDay_reminderTimeUTC_day_idx" ON "DraftWritingDay"("reminderTimeUTC", "day");

-- CreateIndex
CREATE UNIQUE INDEX "DraftWritingDay_planId_day_key" ON "DraftWritingDay"("planId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "DaysChallenge_userId_key" ON "DaysChallenge"("userId");

-- CreateIndex
CREATE INDEX "DaysChallenge_userId_idx" ON "DaysChallenge"("userId");

-- CreateIndex
CREATE INDEX "DaysChallenge_status_idx" ON "DaysChallenge"("status");

-- CreateIndex
CREATE INDEX "DaysChallenge_endDate_idx" ON "DaysChallenge"("endDate");

-- CreateIndex
CREATE INDEX "DaysChallenge_createdAt_idx" ON "DaysChallenge"("createdAt");

-- CreateIndex
CREATE INDEX "DaysChallengesFocus_challengeId_idx" ON "DaysChallengesFocus"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "DaysChallengesFocus_challengeId_focus_key" ON "DaysChallengesFocus"("challengeId", "focus");

-- CreateIndex
CREATE INDEX "DaysChallengeCheckIn_challengeId_idx" ON "DaysChallengeCheckIn"("challengeId");

-- CreateIndex
CREATE INDEX "DaysChallengeCheckIn_userId_idx" ON "DaysChallengeCheckIn"("userId");

-- CreateIndex
CREATE INDEX "DaysChallengeCheckIn_checkInDate_idx" ON "DaysChallengeCheckIn"("checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "DaysChallengeCheckIn_challengeId_checkInDate_key" ON "DaysChallengeCheckIn"("challengeId", "checkInDate");

-- AddForeignKey
ALTER TABLE "DraftPlan" ADD CONSTRAINT "DraftPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPlanCharacter" ADD CONSTRAINT "DraftPlanCharacter_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DraftPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftProgressLog" ADD CONSTRAINT "DraftProgressLog_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DraftPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftProgressLog" ADD CONSTRAINT "DraftProgressLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftWritingDay" ADD CONSTRAINT "DraftWritingDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DraftPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DaysChallenge" ADD CONSTRAINT "DaysChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DaysChallengesFocus" ADD CONSTRAINT "DaysChallengesFocus_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "DaysChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DaysChallengeCheckIn" ADD CONSTRAINT "DaysChallengeCheckIn_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "DaysChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DaysChallengeCheckIn" ADD CONSTRAINT "DaysChallengeCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
