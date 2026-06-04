-- DropForeignKey
ALTER TABLE "WritingDraft" DROP CONSTRAINT "WritingDraft_sourceSubmissionId_fkey";

-- AddForeignKey
ALTER TABLE "WritingDraft" ADD CONSTRAINT "WritingDraft_sourceSubmissionId_fkey" FOREIGN KEY ("sourceSubmissionId") REFERENCES "FeedbackSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
