-- DropForeignKey
ALTER TABLE "BlogComment" DROP CONSTRAINT "BlogComment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "BlogReply" DROP CONSTRAINT "BlogReply_authorId_fkey";

-- DropForeignKey
ALTER TABLE "FeedbackResponse" DROP CONSTRAINT "FeedbackResponse_criticId_fkey";

-- DropForeignKey
ALTER TABLE "ParagraphComment" DROP CONSTRAINT "ParagraphComment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ParagraphCommentReply" DROP CONSTRAINT "ParagraphCommentReply_authorId_fkey";

-- DropForeignKey
ALTER TABLE "SnippetComment" DROP CONSTRAINT "SnippetComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "SnippetReply" DROP CONSTRAINT "SnippetReply_userId_fkey";

-- DropForeignKey
ALTER TABLE "WallPost" DROP CONSTRAINT "WallPost_authorId_fkey";

-- DropForeignKey
ALTER TABLE "WallPostComment" DROP CONSTRAINT "WallPostComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "WallPostReply" DROP CONSTRAINT "WallPostReply_userId_fkey";

-- DropIndex
DROP INDEX "FeedbackResponse_submissionId_criticId_key";

-- AlterTable
ALTER TABLE "BlogComment" ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "BlogReply" ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FeedbackResponse" ALTER COLUMN "criticId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ParagraphComment" ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ParagraphCommentReply" ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SnippetComment" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SnippetReply" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WallPost" ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WallPostComment" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WallPostReply" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SnippetComment" ADD CONSTRAINT "SnippetComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnippetReply" ADD CONSTRAINT "SnippetReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogReply" ADD CONSTRAINT "BlogReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPost" ADD CONSTRAINT "WallPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPostComment" ADD CONSTRAINT "WallPostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPostReply" ADD CONSTRAINT "WallPostReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_criticId_fkey" FOREIGN KEY ("criticId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagraphComment" ADD CONSTRAINT "ParagraphComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagraphCommentReply" ADD CONSTRAINT "ParagraphCommentReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
