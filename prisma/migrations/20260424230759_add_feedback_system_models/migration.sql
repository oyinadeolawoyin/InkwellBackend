-- CreateEnum
CREATE TYPE "DraftStage" AS ENUM ('ROUGH', 'POLISHING', 'FINAL_EDIT');

-- CreateEnum
CREATE TYPE "WordCountTier" AS ENUM ('TIER_1000', 'TIER_2000', 'TIER_3000', 'TIER_4000');

-- CreateTable
CREATE TABLE "feedback_hub_bootstrap" (
    "id" SERIAL NOT NULL,
    "posterCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "feedback_hub_bootstrap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackPoint" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "postingBalance" INTEGER NOT NULL DEFAULT 5,
    "reputation" INTEGER NOT NULL DEFAULT 5,
    "usedFreePost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackSubmission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "wordCountTier" "WordCountTier" NOT NULL,
    "actualWordCount" INTEGER NOT NULL,
    "draftStage" "DraftStage" NOT NULL,
    "contentWarnings" TEXT[],
    "feedbackWanted" TEXT[],
    "pointsCost" INTEGER NOT NULL,
    "wasFreePost" BOOLEAN NOT NULL DEFAULT false,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackResponse" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "criticId" INTEGER NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "clarityRating" INTEGER NOT NULL,
    "pacingRating" INTEGER NOT NULL,
    "believabilityRating" INTEGER NOT NULL,
    "generalFeedback" TEXT NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackResponseUpvote" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "responseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackResponseUpvote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParagraphComment" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "paragraphIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParagraphComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParagraphCommentUpvote" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParagraphCommentUpvote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParagraphCommentReply" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParagraphCommentReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackPoint_userId_key" ON "FeedbackPoint"("userId");

-- CreateIndex
CREATE INDEX "FeedbackSubmission_userId_idx" ON "FeedbackSubmission"("userId");

-- CreateIndex
CREATE INDEX "FeedbackSubmission_isOpen_idx" ON "FeedbackSubmission"("isOpen");

-- CreateIndex
CREATE INDEX "FeedbackSubmission_createdAt_idx" ON "FeedbackSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "FeedbackSubmission_genre_idx" ON "FeedbackSubmission"("genre");

-- CreateIndex
CREATE INDEX "FeedbackResponse_submissionId_idx" ON "FeedbackResponse"("submissionId");

-- CreateIndex
CREATE INDEX "FeedbackResponse_criticId_idx" ON "FeedbackResponse"("criticId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackResponse_submissionId_criticId_key" ON "FeedbackResponse"("submissionId", "criticId");

-- CreateIndex
CREATE INDEX "FeedbackResponseUpvote_responseId_idx" ON "FeedbackResponseUpvote"("responseId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackResponseUpvote_userId_responseId_key" ON "FeedbackResponseUpvote"("userId", "responseId");

-- CreateIndex
CREATE INDEX "ParagraphComment_submissionId_idx" ON "ParagraphComment"("submissionId");

-- CreateIndex
CREATE INDEX "ParagraphComment_submissionId_paragraphIndex_idx" ON "ParagraphComment"("submissionId", "paragraphIndex");

-- CreateIndex
CREATE INDEX "ParagraphComment_authorId_idx" ON "ParagraphComment"("authorId");

-- CreateIndex
CREATE INDEX "ParagraphCommentUpvote_commentId_idx" ON "ParagraphCommentUpvote"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParagraphCommentUpvote_userId_commentId_key" ON "ParagraphCommentUpvote"("userId", "commentId");

-- CreateIndex
CREATE INDEX "ParagraphCommentReply_commentId_idx" ON "ParagraphCommentReply"("commentId");

-- CreateIndex
CREATE INDEX "ParagraphCommentReply_authorId_idx" ON "ParagraphCommentReply"("authorId");

-- AddForeignKey
ALTER TABLE "FeedbackPoint" ADD CONSTRAINT "FeedbackPoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackSubmission" ADD CONSTRAINT "FeedbackSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FeedbackSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_criticId_fkey" FOREIGN KEY ("criticId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponseUpvote" ADD CONSTRAINT "FeedbackResponseUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponseUpvote" ADD CONSTRAINT "FeedbackResponseUpvote_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "FeedbackResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagraphComment" ADD CONSTRAINT "ParagraphComment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FeedbackSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagraphComment" ADD CONSTRAINT "ParagraphComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagraphCommentUpvote" ADD CONSTRAINT "ParagraphCommentUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagraphCommentUpvote" ADD CONSTRAINT "ParagraphCommentUpvote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ParagraphComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagraphCommentReply" ADD CONSTRAINT "ParagraphCommentReply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ParagraphComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagraphCommentReply" ADD CONSTRAINT "ParagraphCommentReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
