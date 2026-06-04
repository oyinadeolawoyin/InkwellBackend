/*
  Warnings:

  - You are about to drop the column `believabilityRating` on the `FeedbackResponse` table. All the data in the column will be lost.
  - You are about to drop the column `clarityRating` on the `FeedbackResponse` table. All the data in the column will be lost.
  - You are about to drop the column `overallRating` on the `FeedbackResponse` table. All the data in the column will be lost.
  - You are about to drop the column `pacingRating` on the `FeedbackResponse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FeedbackResponse" DROP COLUMN "believabilityRating",
DROP COLUMN "clarityRating",
DROP COLUMN "overallRating",
DROP COLUMN "pacingRating",
ADD COLUMN     "tagResponses" JSONB;
