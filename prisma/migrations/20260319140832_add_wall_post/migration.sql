-- DropIndex
DROP INDEX "WritingSnippet_sourceType_idx";

-- AlterTable
ALTER TABLE "WritingSnippet" ADD COLUMN     "tags" TEXT;

-- CreateTable
CREATE TABLE "WallPost" (
    "id" SERIAL NOT NULL,
    "authorId" INTEGER NOT NULL,
    "profileId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WallPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WallPostLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "wallPostId" INTEGER NOT NULL,

    CONSTRAINT "WallPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WallPostComment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "wallPostId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WallPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WallPostReply" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WallPostReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WallPost_profileId_idx" ON "WallPost"("profileId");

-- CreateIndex
CREATE INDEX "WallPost_authorId_idx" ON "WallPost"("authorId");

-- CreateIndex
CREATE INDEX "WallPostLike_wallPostId_idx" ON "WallPostLike"("wallPostId");

-- CreateIndex
CREATE UNIQUE INDEX "WallPostLike_userId_wallPostId_key" ON "WallPostLike"("userId", "wallPostId");

-- CreateIndex
CREATE INDEX "WallPostComment_wallPostId_idx" ON "WallPostComment"("wallPostId");

-- CreateIndex
CREATE INDEX "WallPostComment_userId_idx" ON "WallPostComment"("userId");

-- CreateIndex
CREATE INDEX "WallPostReply_commentId_idx" ON "WallPostReply"("commentId");

-- CreateIndex
CREATE INDEX "WallPostReply_userId_idx" ON "WallPostReply"("userId");

-- AddForeignKey
ALTER TABLE "WallPost" ADD CONSTRAINT "WallPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPost" ADD CONSTRAINT "WallPost_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPostLike" ADD CONSTRAINT "WallPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPostLike" ADD CONSTRAINT "WallPostLike_wallPostId_fkey" FOREIGN KEY ("wallPostId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPostComment" ADD CONSTRAINT "WallPostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPostComment" ADD CONSTRAINT "WallPostComment_wallPostId_fkey" FOREIGN KEY ("wallPostId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPostReply" ADD CONSTRAINT "WallPostReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPostReply" ADD CONSTRAINT "WallPostReply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "WallPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
