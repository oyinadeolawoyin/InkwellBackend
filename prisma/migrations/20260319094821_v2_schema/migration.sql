/*
  Warnings:

  - You are about to drop the column `checkout` on the `Sprint` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Sprint` table. All the data in the column will be lost.
  - You are about to drop the column `isPause` on the `Sprint` table. All the data in the column will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeeklyProgress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WritingPlan` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[resetToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `startWords` to the `Sprint` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SnippetSource" AS ENUM ('POST_SPRINT', 'STANDALONE');

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyProgress" DROP CONSTRAINT "WeeklyProgress_userId_fkey";

-- DropForeignKey
ALTER TABLE "WritingPlan" DROP CONSTRAINT "WritingPlan_userId_fkey";

-- DropIndex
DROP INDEX "Sprint_startedAt_idx";

-- AlterTable
ALTER TABLE "Sprint" DROP COLUMN "checkout",
DROP COLUMN "duration",
DROP COLUMN "isPause",
ADD COLUMN     "groupSprintId" INTEGER,
ADD COLUMN     "startWords" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "WeeklyProgress";

-- DropTable
DROP TABLE "WritingPlan";

-- CreateTable
CREATE TABLE "GroupSprint" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "groupPurpose" TEXT,
    "groupThankNote" TEXT,
    "soundscape" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GroupSprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSchedule" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingSnippet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "proudOf" TEXT,
    "struggle" TEXT,
    "sourceType" "SnippetSource" NOT NULL DEFAULT 'POST_SPRINT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingSnippet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnippetLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "snippetId" INTEGER NOT NULL,

    CONSTRAINT "SnippetLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnippetComment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "snippetId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnippetComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnippetReply" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnippetReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPostLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "blogPostId" INTEGER NOT NULL,

    CONSTRAINT "BlogPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogComment" (
    "id" SERIAL NOT NULL,
    "blogPostId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogReply" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupSprint_userId_idx" ON "GroupSprint"("userId");

-- CreateIndex
CREATE INDEX "GroupSprint_isActive_idx" ON "GroupSprint"("isActive");

-- CreateIndex
CREATE INDEX "GroupSprint_startedAt_idx" ON "GroupSprint"("startedAt");

-- CreateIndex
CREATE INDEX "SessionSchedule_dayOfWeek_idx" ON "SessionSchedule"("dayOfWeek");

-- CreateIndex
CREATE INDEX "SessionSchedule_isActive_idx" ON "SessionSchedule"("isActive");

-- CreateIndex
CREATE INDEX "WritingSnippet_userId_idx" ON "WritingSnippet"("userId");

-- CreateIndex
CREATE INDEX "WritingSnippet_createdAt_idx" ON "WritingSnippet"("createdAt");

-- CreateIndex
CREATE INDEX "WritingSnippet_sourceType_idx" ON "WritingSnippet"("sourceType");

-- CreateIndex
CREATE INDEX "SnippetLike_snippetId_idx" ON "SnippetLike"("snippetId");

-- CreateIndex
CREATE UNIQUE INDEX "SnippetLike_userId_snippetId_key" ON "SnippetLike"("userId", "snippetId");

-- CreateIndex
CREATE INDEX "SnippetComment_snippetId_idx" ON "SnippetComment"("snippetId");

-- CreateIndex
CREATE INDEX "SnippetComment_userId_idx" ON "SnippetComment"("userId");

-- CreateIndex
CREATE INDEX "SnippetReply_commentId_idx" ON "SnippetReply"("commentId");

-- CreateIndex
CREATE INDEX "SnippetReply_userId_idx" ON "SnippetReply"("userId");

-- CreateIndex
CREATE INDEX "BlogPost_createdAt_idx" ON "BlogPost"("createdAt");

-- CreateIndex
CREATE INDEX "BlogPostLike_blogPostId_idx" ON "BlogPostLike"("blogPostId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPostLike_userId_blogPostId_key" ON "BlogPostLike"("userId", "blogPostId");

-- CreateIndex
CREATE INDEX "BlogComment_blogPostId_idx" ON "BlogComment"("blogPostId");

-- CreateIndex
CREATE INDEX "BlogComment_authorId_idx" ON "BlogComment"("authorId");

-- CreateIndex
CREATE INDEX "BlogReply_commentId_idx" ON "BlogReply"("commentId");

-- CreateIndex
CREATE INDEX "BlogReply_authorId_idx" ON "BlogReply"("authorId");

-- CreateIndex
CREATE INDEX "Sprint_groupSprintId_idx" ON "Sprint"("groupSprintId");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- AddForeignKey
ALTER TABLE "GroupSprint" ADD CONSTRAINT "GroupSprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_groupSprintId_fkey" FOREIGN KEY ("groupSprintId") REFERENCES "GroupSprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingSnippet" ADD CONSTRAINT "WritingSnippet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnippetLike" ADD CONSTRAINT "SnippetLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnippetLike" ADD CONSTRAINT "SnippetLike_snippetId_fkey" FOREIGN KEY ("snippetId") REFERENCES "WritingSnippet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnippetComment" ADD CONSTRAINT "SnippetComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnippetComment" ADD CONSTRAINT "SnippetComment_snippetId_fkey" FOREIGN KEY ("snippetId") REFERENCES "WritingSnippet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnippetReply" ADD CONSTRAINT "SnippetReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnippetReply" ADD CONSTRAINT "SnippetReply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "SnippetComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogReply" ADD CONSTRAINT "BlogReply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "BlogComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogReply" ADD CONSTRAINT "BlogReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
