-- AlterEnum
ALTER TYPE "SnippetSource" ADD VALUE 'DAYS_CHALLENGE';

-- AlterTable
ALTER TABLE "WritingDraft" ADD COLUMN     "isStagedForFeedback" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stagedAt" TIMESTAMP(3),
ADD COLUMN     "stagedContentWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "stagedDraftStage" "DraftStage",
ADD COLUMN     "stagedFeedbackWanted" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "stagedGenre" TEXT,
ADD COLUMN     "stagedSummary" TEXT,
ADD COLUMN     "stagedWordCountTier" "WordCountTier";

-- CreateIndex
CREATE INDEX "WritingDraft_userId_isStagedForFeedback_idx" ON "WritingDraft"("userId", "isStagedForFeedback");
