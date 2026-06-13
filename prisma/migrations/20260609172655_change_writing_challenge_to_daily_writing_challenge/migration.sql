/*
  Warnings:

  - The values [DAYS_CHALLENGE] on the enum `SnippetSource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `challengeId` on the `ChallengeParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `ChallengeParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `currentCount` on the `ChallengeParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `dailyGoal` on the `ChallengeParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `personalEndDate` on the `ChallengeParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `personalStartDate` on the `ChallengeParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `previousTotal` on the `ChallengeParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `retakeNumber` on the `ChallengeParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `startingCount` on the `ChallengeParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `targetCount` on the `ChallengeParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `trackingUnit` on the `ChallengeParticipation` table. All the data in the column will be lost.
  - You are about to drop the `WritingChallenge` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `ChallengeParticipation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('WORDS', 'CHAPTERS', 'SCENES', 'DURATION');

-- AlterEnum
BEGIN;
CREATE TYPE "SnippetSource_new" AS ENUM ('POST_SPRINT', 'STANDALONE');
ALTER TABLE "WritingSnippet" ALTER COLUMN "sourceType" DROP DEFAULT;
ALTER TABLE "WritingSnippet" ALTER COLUMN "sourceType" TYPE "SnippetSource_new" USING ("sourceType"::text::"SnippetSource_new");
ALTER TYPE "SnippetSource" RENAME TO "SnippetSource_old";
ALTER TYPE "SnippetSource_new" RENAME TO "SnippetSource";
DROP TYPE "SnippetSource_old";
ALTER TABLE "WritingSnippet" ALTER COLUMN "sourceType" SET DEFAULT 'POST_SPRINT';
COMMIT;

-- DropForeignKey
ALTER TABLE "ChallengeParticipation" DROP CONSTRAINT "ChallengeParticipation_challengeId_fkey";

-- DropIndex
DROP INDEX "ChallengeParticipation_challengeId_idx";

-- DropIndex
DROP INDEX "ChallengeParticipation_challengeId_userId_retakeNumber_key";

-- AlterTable
ALTER TABLE "ChallengeParticipation" DROP COLUMN "challengeId",
DROP COLUMN "completedAt",
DROP COLUMN "currentCount",
DROP COLUMN "dailyGoal",
DROP COLUMN "personalEndDate",
DROP COLUMN "personalStartDate",
DROP COLUMN "previousTotal",
DROP COLUMN "retakeNumber",
DROP COLUMN "startingCount",
DROP COLUMN "targetCount",
DROP COLUMN "trackingUnit",
ADD COLUMN     "goalType" "GoalType" NOT NULL DEFAULT 'WORDS',
ADD COLUMN     "goalValue" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "challengeLongestStreak" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "WritingChallenge";

-- DropEnum
DROP TYPE "ChallengeUnit";

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeParticipation_userId_key" ON "ChallengeParticipation"("userId");

-- CreateIndex
CREATE INDEX "ChallengeParticipation_currentStreak_idx" ON "ChallengeParticipation"("currentStreak");
