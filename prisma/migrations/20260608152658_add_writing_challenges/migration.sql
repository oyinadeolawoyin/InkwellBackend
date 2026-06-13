/*
  Warnings:

  - You are about to drop the `EventWinner` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Note` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlatformEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectDayLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectEventEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectProgressLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectSessionLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectWordLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Todolist` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('DAILY', 'SEVEN_DAY', 'FIFTEEN_DAY');

-- CreateEnum
CREATE TYPE "ChallengeUnit" AS ENUM ('WORDS', 'CHAPTERS');

-- DropForeignKey
ALTER TABLE "EventWinner" DROP CONSTRAINT "EventWinner_eventId_fkey";

-- DropForeignKey
ALTER TABLE "EventWinner" DROP CONSTRAINT "EventWinner_userId_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_userId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectDayLog" DROP CONSTRAINT "ProjectDayLog_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectEventEntry" DROP CONSTRAINT "ProjectEventEntry_eventId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectEventEntry" DROP CONSTRAINT "ProjectEventEntry_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectProgressLog" DROP CONSTRAINT "ProjectProgressLog_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectSessionLog" DROP CONSTRAINT "ProjectSessionLog_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectWordLog" DROP CONSTRAINT "ProjectWordLog_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Sprint" DROP CONSTRAINT "Sprint_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Todolist" DROP CONSTRAINT "Todolist_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Todolist" DROP CONSTRAINT "Todolist_userId_fkey";

-- DropTable
DROP TABLE "EventWinner";

-- DropTable
DROP TABLE "Note";

-- DropTable
DROP TABLE "PlatformEvent";

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "ProjectDayLog";

-- DropTable
DROP TABLE "ProjectEventEntry";

-- DropTable
DROP TABLE "ProjectProgressLog";

-- DropTable
DROP TABLE "ProjectSessionLog";

-- DropTable
DROP TABLE "ProjectWordLog";

-- DropTable
DROP TABLE "Todolist";

-- DropEnum
DROP TYPE "ChallengeRole";

-- DropEnum
DROP TYPE "EventType";

-- DropEnum
DROP TYPE "ProjectStatus";

-- DropEnum
DROP TYPE "SessionGoalType";

-- DropEnum
DROP TYPE "WritingPhase";

-- CreateTable
CREATE TABLE "WritingChallenge" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ChallengeType" NOT NULL,
    "trackingUnit" "ChallengeUnit" NOT NULL DEFAULT 'WORDS',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeParticipation" (
    "id" SERIAL NOT NULL,
    "challengeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "retakeNumber" INTEGER NOT NULL DEFAULT 1,
    "targetCount" INTEGER NOT NULL,
    "dailyGoal" INTEGER NOT NULL,
    "trackingUnit" "ChallengeUnit" NOT NULL DEFAULT 'WORDS',
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "previousTotal" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "missedDaysInRow" INTEGER NOT NULL DEFAULT 0,
    "lastCheckInDate" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChallengeParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeCheckIn" (
    "id" SERIAL NOT NULL,
    "participationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "countLogged" INTEGER NOT NULL,
    "metDailyGoal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WritingChallenge_type_idx" ON "WritingChallenge"("type");

-- CreateIndex
CREATE INDEX "WritingChallenge_isActive_idx" ON "WritingChallenge"("isActive");

-- CreateIndex
CREATE INDEX "WritingChallenge_startDate_idx" ON "WritingChallenge"("startDate");

-- CreateIndex
CREATE INDEX "WritingChallenge_createdBy_idx" ON "WritingChallenge"("createdBy");

-- CreateIndex
CREATE INDEX "ChallengeParticipation_challengeId_idx" ON "ChallengeParticipation"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeParticipation_userId_idx" ON "ChallengeParticipation"("userId");

-- CreateIndex
CREATE INDEX "ChallengeParticipation_isActive_idx" ON "ChallengeParticipation"("isActive");

-- CreateIndex
CREATE INDEX "ChallengeParticipation_joinedAt_idx" ON "ChallengeParticipation"("joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeParticipation_challengeId_userId_retakeNumber_key" ON "ChallengeParticipation"("challengeId", "userId", "retakeNumber");

-- CreateIndex
CREATE INDEX "ChallengeCheckIn_participationId_idx" ON "ChallengeCheckIn"("participationId");

-- CreateIndex
CREATE INDEX "ChallengeCheckIn_userId_idx" ON "ChallengeCheckIn"("userId");

-- CreateIndex
CREATE INDEX "ChallengeCheckIn_checkInDate_idx" ON "ChallengeCheckIn"("checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeCheckIn_participationId_checkInDate_key" ON "ChallengeCheckIn"("participationId", "checkInDate");

-- AddForeignKey
ALTER TABLE "ChallengeParticipation" ADD CONSTRAINT "ChallengeParticipation_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "WritingChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipation" ADD CONSTRAINT "ChallengeParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeCheckIn" ADD CONSTRAINT "ChallengeCheckIn_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "ChallengeParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeCheckIn" ADD CONSTRAINT "ChallengeCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
