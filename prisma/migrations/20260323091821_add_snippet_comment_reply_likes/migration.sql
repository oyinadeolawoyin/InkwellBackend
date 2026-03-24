-- CreateTable
CREATE TABLE "SnippetCommentLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,

    CONSTRAINT "SnippetCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnippetReplyLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "replyId" INTEGER NOT NULL,

    CONSTRAINT "SnippetReplyLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SnippetCommentLike_commentId_idx" ON "SnippetCommentLike"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "SnippetCommentLike_userId_commentId_key" ON "SnippetCommentLike"("userId", "commentId");

-- CreateIndex
CREATE INDEX "SnippetReplyLike_replyId_idx" ON "SnippetReplyLike"("replyId");

-- CreateIndex
CREATE UNIQUE INDEX "SnippetReplyLike_userId_replyId_key" ON "SnippetReplyLike"("userId", "replyId");

-- AddForeignKey
ALTER TABLE "SnippetCommentLike" ADD CONSTRAINT "SnippetCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnippetCommentLike" ADD CONSTRAINT "SnippetCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "SnippetComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnippetReplyLike" ADD CONSTRAINT "SnippetReplyLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnippetReplyLike" ADD CONSTRAINT "SnippetReplyLike_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "SnippetReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
