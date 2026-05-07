-- AlterTable
ALTER TABLE "FeedbackResponse" ALTER COLUMN "overallRating" DROP NOT NULL,
ALTER COLUMN "clarityRating" DROP NOT NULL,
ALTER COLUMN "pacingRating" DROP NOT NULL,
ALTER COLUMN "believabilityRating" DROP NOT NULL;
