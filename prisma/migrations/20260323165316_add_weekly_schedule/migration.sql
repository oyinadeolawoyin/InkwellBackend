/*
  Warnings:

  - You are about to drop the `SessionSchedule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "SessionSchedule";

-- CreateTable
CREATE TABLE "WeeklySchedule" (
    "id" SERIAL NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledSession" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "label" TEXT,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySchedule_weekStart_key" ON "WeeklySchedule"("weekStart");

-- CreateIndex
CREATE INDEX "WeeklySchedule_weekStart_idx" ON "WeeklySchedule"("weekStart");

-- CreateIndex
CREATE INDEX "WeeklySchedule_isActive_idx" ON "WeeklySchedule"("isActive");

-- CreateIndex
CREATE INDEX "ScheduledSession_scheduleId_idx" ON "ScheduledSession"("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduledSession_dayOfWeek_idx" ON "ScheduledSession"("dayOfWeek");

-- CreateIndex
CREATE INDEX "ScheduledSession_isDone_idx" ON "ScheduledSession"("isDone");

-- AddForeignKey
ALTER TABLE "ScheduledSession" ADD CONSTRAINT "ScheduledSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WeeklySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
