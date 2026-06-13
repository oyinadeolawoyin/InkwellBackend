/*
  Warnings:

  - You are about to drop the column `endDate` on the `WritingChallenge` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `WritingChallenge` table. All the data in the column will be lost.
  - You are about to drop the column `trackingUnit` on the `WritingChallenge` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `WritingChallenge` table. All the data in the column will be lost.
  - Added the required column `personalEndDate` to the `ChallengeParticipation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personalStartDate` to the `ChallengeParticipation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationDays` to the `WritingChallenge` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "WritingChallenge_startDate_idx";

-- DropIndex
DROP INDEX "WritingChallenge_type_idx";

-- AlterTable
ALTER TABLE "ChallengeParticipation" ADD COLUMN     "personalEndDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "personalStartDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WritingChallenge" DROP COLUMN "endDate",
DROP COLUMN "startDate",
DROP COLUMN "trackingUnit",
DROP COLUMN "type",
ADD COLUMN     "durationDays" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "ChallengeType";

-- CreateIndex
CREATE INDEX "WritingChallenge_createdAt_idx" ON "WritingChallenge"("createdAt");
