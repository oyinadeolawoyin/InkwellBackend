/*
  Warnings:

  - You are about to drop the column `isOpen` on the `FeedbackSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `isOutdated` on the `FeedbackSubmission` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('QUEUE', 'SPOTLIGHT', 'ARCHIVE');

-- DropIndex
DROP INDEX "FeedbackSubmission_isOpen_idx";

-- AlterTable
ALTER TABLE "FeedbackSubmission" DROP COLUMN "isOpen",
DROP COLUMN "isOutdated",
ADD COLUMN     "status" "SubmissionStatus" NOT NULL DEFAULT 'QUEUE';

-- CreateIndex
CREATE INDEX "FeedbackSubmission_status_idx" ON "FeedbackSubmission"("status");
