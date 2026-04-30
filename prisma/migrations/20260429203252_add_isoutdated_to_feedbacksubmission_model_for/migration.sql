-- AlterTable
ALTER TABLE "FeedbackSubmission" ADD COLUMN     "critiqueCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isOutdated" BOOLEAN NOT NULL DEFAULT false;
