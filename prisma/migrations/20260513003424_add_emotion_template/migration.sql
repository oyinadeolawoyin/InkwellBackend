/*
  Warnings:

  - You are about to drop the `Quote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuoteLike` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "QuoteLike" DROP CONSTRAINT "QuoteLike_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteLike" DROP CONSTRAINT "QuoteLike_userId_fkey";

-- DropTable
DROP TABLE "Quote";

-- DropTable
DROP TABLE "QuoteLike";

-- CreateTable
CREATE TABLE "EmotionEntry" (
    "id" SERIAL NOT NULL,
    "emotion" TEXT NOT NULL,
    "cues" TEXT[],
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmotionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionTemplate" (
    "id" SERIAL NOT NULL,
    "emotion" TEXT NOT NULL,
    "cues" TEXT[],
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "EmotionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "entryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmotionLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionComment" (
    "id" SERIAL NOT NULL,
    "entryId" INTEGER NOT NULL,
    "authorId" INTEGER,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmotionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionCommentLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmotionCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmotionEntry_scheduledAt_key" ON "EmotionEntry"("scheduledAt");

-- CreateIndex
CREATE INDEX "EmotionEntry_scheduledAt_idx" ON "EmotionEntry"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmotionTemplate_sortOrder_key" ON "EmotionTemplate"("sortOrder");

-- CreateIndex
CREATE INDEX "EmotionTemplate_sortOrder_idx" ON "EmotionTemplate"("sortOrder");

-- CreateIndex
CREATE INDEX "EmotionLike_entryId_idx" ON "EmotionLike"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "EmotionLike_userId_entryId_key" ON "EmotionLike"("userId", "entryId");

-- CreateIndex
CREATE INDEX "EmotionComment_entryId_idx" ON "EmotionComment"("entryId");

-- CreateIndex
CREATE INDEX "EmotionComment_authorId_idx" ON "EmotionComment"("authorId");

-- CreateIndex
CREATE INDEX "EmotionCommentLike_commentId_idx" ON "EmotionCommentLike"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "EmotionCommentLike_userId_commentId_key" ON "EmotionCommentLike"("userId", "commentId");

-- AddForeignKey
ALTER TABLE "EmotionLike" ADD CONSTRAINT "EmotionLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionLike" ADD CONSTRAINT "EmotionLike_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "EmotionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionComment" ADD CONSTRAINT "EmotionComment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "EmotionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionComment" ADD CONSTRAINT "EmotionComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionCommentLike" ADD CONSTRAINT "EmotionCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionCommentLike" ADD CONSTRAINT "EmotionCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "EmotionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
