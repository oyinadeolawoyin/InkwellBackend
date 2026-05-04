-- CreateEnum
CREATE TYPE "ChallengeRole" AS ENUM ('STREAK_KEEPER', 'CHAMPION', 'IRON_PEN');

-- CreateTable
CREATE TABLE "EventWinner" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "finalStreak" INTEGER NOT NULL,
    "totalWords" INTEGER NOT NULL DEFAULT 0,
    "totalChapters" INTEGER NOT NULL DEFAULT 0,
    "totalScenes" INTEGER NOT NULL DEFAULT 0,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "challengeRole" "ChallengeRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventWinner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventWinner_eventId_idx" ON "EventWinner"("eventId");

-- CreateIndex
CREATE INDEX "EventWinner_userId_idx" ON "EventWinner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventWinner_eventId_userId_key" ON "EventWinner"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "EventWinner" ADD CONSTRAINT "EventWinner_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PlatformEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWinner" ADD CONSTRAINT "EventWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
