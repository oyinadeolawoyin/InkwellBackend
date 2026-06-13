-- CreateTable
CREATE TABLE "Thread" (
    "id" SERIAL NOT NULL,
    "authorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "threadId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadComment" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "authorId" INTEGER,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreadComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadCommentLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadReply" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "authorId" INTEGER,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreadReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadReplyLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "replyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadReplyLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Thread_authorId_idx" ON "Thread"("authorId");

-- CreateIndex
CREATE INDEX "Thread_createdAt_idx" ON "Thread"("createdAt");

-- CreateIndex
CREATE INDEX "Thread_isPinned_idx" ON "Thread"("isPinned");

-- CreateIndex
CREATE INDEX "ThreadLike_threadId_idx" ON "ThreadLike"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadLike_userId_threadId_key" ON "ThreadLike"("userId", "threadId");

-- CreateIndex
CREATE INDEX "ThreadComment_threadId_idx" ON "ThreadComment"("threadId");

-- CreateIndex
CREATE INDEX "ThreadComment_authorId_idx" ON "ThreadComment"("authorId");

-- CreateIndex
CREATE INDEX "ThreadCommentLike_commentId_idx" ON "ThreadCommentLike"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadCommentLike_userId_commentId_key" ON "ThreadCommentLike"("userId", "commentId");

-- CreateIndex
CREATE INDEX "ThreadReply_commentId_idx" ON "ThreadReply"("commentId");

-- CreateIndex
CREATE INDEX "ThreadReply_authorId_idx" ON "ThreadReply"("authorId");

-- CreateIndex
CREATE INDEX "ThreadReplyLike_replyId_idx" ON "ThreadReplyLike"("replyId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadReplyLike_userId_replyId_key" ON "ThreadReplyLike"("userId", "replyId");

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadLike" ADD CONSTRAINT "ThreadLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadLike" ADD CONSTRAINT "ThreadLike_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadComment" ADD CONSTRAINT "ThreadComment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadComment" ADD CONSTRAINT "ThreadComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadCommentLike" ADD CONSTRAINT "ThreadCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadCommentLike" ADD CONSTRAINT "ThreadCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ThreadComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadReply" ADD CONSTRAINT "ThreadReply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ThreadComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadReply" ADD CONSTRAINT "ThreadReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadReplyLike" ADD CONSTRAINT "ThreadReplyLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadReplyLike" ADD CONSTRAINT "ThreadReplyLike_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "ThreadReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
