-- CreateTable
CREATE TABLE "DiscoveryStory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "firstChapter" TEXT NOT NULL,
    "coverUrl" TEXT,
    "authorName" TEXT NOT NULL,
    "recommendedBy" TEXT,
    "platform" TEXT NOT NULL,
    "platformLink" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "storyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscoveryStory_userId_idx" ON "DiscoveryStory"("userId");

-- CreateIndex
CREATE INDEX "DiscoveryStory_isApproved_idx" ON "DiscoveryStory"("isApproved");

-- CreateIndex
CREATE INDEX "DiscoveryStory_createdAt_idx" ON "DiscoveryStory"("createdAt");

-- CreateIndex
CREATE INDEX "DiscoveryStory_genre_idx" ON "DiscoveryStory"("genre");

-- CreateIndex
CREATE INDEX "DiscoveryLike_storyId_idx" ON "DiscoveryLike"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryLike_userId_storyId_key" ON "DiscoveryLike"("userId", "storyId");

-- AddForeignKey
ALTER TABLE "DiscoveryStory" ADD CONSTRAINT "DiscoveryStory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryLike" ADD CONSTRAINT "DiscoveryLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryLike" ADD CONSTRAINT "DiscoveryLike_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "DiscoveryStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
