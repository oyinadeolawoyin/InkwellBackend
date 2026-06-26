/*
  Warnings:

  - You are about to drop the `DiscoveryLike` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DiscoveryStory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmotionComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmotionCommentLike` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmotionEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmotionLike` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmotionTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WallPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WallPostComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WallPostLike` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WallPostReply` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DiscoveryLike" DROP CONSTRAINT "DiscoveryLike_storyId_fkey";

-- DropForeignKey
ALTER TABLE "DiscoveryLike" DROP CONSTRAINT "DiscoveryLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "DiscoveryStory" DROP CONSTRAINT "DiscoveryStory_userId_fkey";

-- DropForeignKey
ALTER TABLE "EmotionComment" DROP CONSTRAINT "EmotionComment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "EmotionComment" DROP CONSTRAINT "EmotionComment_entryId_fkey";

-- DropForeignKey
ALTER TABLE "EmotionCommentLike" DROP CONSTRAINT "EmotionCommentLike_commentId_fkey";

-- DropForeignKey
ALTER TABLE "EmotionCommentLike" DROP CONSTRAINT "EmotionCommentLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "EmotionLike" DROP CONSTRAINT "EmotionLike_entryId_fkey";

-- DropForeignKey
ALTER TABLE "EmotionLike" DROP CONSTRAINT "EmotionLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "WallPost" DROP CONSTRAINT "WallPost_authorId_fkey";

-- DropForeignKey
ALTER TABLE "WallPost" DROP CONSTRAINT "WallPost_profileId_fkey";

-- DropForeignKey
ALTER TABLE "WallPostComment" DROP CONSTRAINT "WallPostComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "WallPostComment" DROP CONSTRAINT "WallPostComment_wallPostId_fkey";

-- DropForeignKey
ALTER TABLE "WallPostLike" DROP CONSTRAINT "WallPostLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "WallPostLike" DROP CONSTRAINT "WallPostLike_wallPostId_fkey";

-- DropForeignKey
ALTER TABLE "WallPostReply" DROP CONSTRAINT "WallPostReply_commentId_fkey";

-- DropForeignKey
ALTER TABLE "WallPostReply" DROP CONSTRAINT "WallPostReply_userId_fkey";

-- DropTable
DROP TABLE "DiscoveryLike";

-- DropTable
DROP TABLE "DiscoveryStory";

-- DropTable
DROP TABLE "EmotionComment";

-- DropTable
DROP TABLE "EmotionCommentLike";

-- DropTable
DROP TABLE "EmotionEntry";

-- DropTable
DROP TABLE "EmotionLike";

-- DropTable
DROP TABLE "EmotionTemplate";

-- DropTable
DROP TABLE "WallPost";

-- DropTable
DROP TABLE "WallPostComment";

-- DropTable
DROP TABLE "WallPostLike";

-- DropTable
DROP TABLE "WallPostReply";

-- CreateTable
CREATE TABLE "DirectConversation" (
    "id" SERIAL NOT NULL,
    "userAId" INTEGER NOT NULL,
    "userBId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "quotedMessageId" INTEGER,
    "quotedContent" TEXT,
    "quotedSenderName" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectConversation_userAId_idx" ON "DirectConversation"("userAId");

-- CreateIndex
CREATE INDEX "DirectConversation_userBId_idx" ON "DirectConversation"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectConversation_userAId_userBId_key" ON "DirectConversation"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_idx" ON "DirectMessage"("conversationId");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_idx" ON "DirectMessage"("senderId");

-- CreateIndex
CREATE INDEX "DirectMessage_quotedMessageId_idx" ON "DirectMessage"("quotedMessageId");

-- AddForeignKey
ALTER TABLE "DirectConversation" ADD CONSTRAINT "DirectConversation_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectConversation" ADD CONSTRAINT "DirectConversation_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DirectConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_quotedMessageId_fkey" FOREIGN KEY ("quotedMessageId") REFERENCES "DirectMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
