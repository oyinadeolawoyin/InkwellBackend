-- AlterTable
ALTER TABLE "DirectConversation" ADD COLUMN     "lastReadByA" TIMESTAMP(3),
ADD COLUMN     "lastReadByB" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BlogLastSeen" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogLastSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogLastSeen_userId_key" ON "BlogLastSeen"("userId");

-- CreateIndex
CREATE INDEX "BlogLastSeen_userId_idx" ON "BlogLastSeen"("userId");

-- AddForeignKey
ALTER TABLE "BlogLastSeen" ADD CONSTRAINT "BlogLastSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
