-- CreateEnum
CREATE TYPE "WritingPhase" AS ENUM ('BRAINSTORMING', 'OUTLINING', 'DRAFTING', 'EDITING');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('ANNOUNCEMENT', 'DAYS_CHALLENGE', 'WORKSHOP', 'OTHER');

-- AlterEnum
ALTER TYPE "SnippetSource" ADD VALUE 'DAYS_CHALLENGE';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "consecutiveDaysTarget" INTEGER,
ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLogDate" TIMESTAMP(3),
ADD COLUMN     "phase" "WritingPhase" NOT NULL DEFAULT 'DRAFTING';

-- CreateTable
CREATE TABLE "PlatformEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "type" "EventType" NOT NULL,
    "daysTarget" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectEventEntry" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disqualified" BOOLEAN NOT NULL DEFAULT false,
    "disqualifiedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectEventEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDayLog" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "wordsLogged" INTEGER NOT NULL DEFAULT 0,
    "chaptersLogged" INTEGER NOT NULL DEFAULT 0,
    "scenesLogged" INTEGER NOT NULL DEFAULT 0,
    "minutesLogged" INTEGER NOT NULL DEFAULT 0,
    "streakAtLog" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDayLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformEvent_isActive_idx" ON "PlatformEvent"("isActive");

-- CreateIndex
CREATE INDEX "PlatformEvent_type_idx" ON "PlatformEvent"("type");

-- CreateIndex
CREATE INDEX "PlatformEvent_startDate_endDate_idx" ON "PlatformEvent"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "ProjectEventEntry_eventId_idx" ON "ProjectEventEntry"("eventId");

-- CreateIndex
CREATE INDEX "ProjectEventEntry_projectId_idx" ON "ProjectEventEntry"("projectId");

-- CreateIndex
CREATE INDEX "ProjectEventEntry_disqualified_idx" ON "ProjectEventEntry"("disqualified");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectEventEntry_projectId_eventId_key" ON "ProjectEventEntry"("projectId", "eventId");

-- CreateIndex
CREATE INDEX "ProjectDayLog_projectId_idx" ON "ProjectDayLog"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDayLog_userId_idx" ON "ProjectDayLog"("userId");

-- CreateIndex
CREATE INDEX "ProjectDayLog_logDate_idx" ON "ProjectDayLog"("logDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDayLog_projectId_logDate_key" ON "ProjectDayLog"("projectId", "logDate");

-- AddForeignKey
ALTER TABLE "ProjectEventEntry" ADD CONSTRAINT "ProjectEventEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEventEntry" ADD CONSTRAINT "ProjectEventEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PlatformEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDayLog" ADD CONSTRAINT "ProjectDayLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
