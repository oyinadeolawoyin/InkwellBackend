/*
  Warnings:

  - Added the required column `updatedAt` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionGoalType" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'ABANDONED');

-- AlterTable
ALTER TABLE "GroupSprint" ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "currentChapters" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentScenes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentSessionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentWordCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "daysPerWeek" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "genre" TEXT,
ADD COLUMN     "lastSessionReset" TIMESTAMP(3),
ADD COLUMN     "sessionGoalCount" INTEGER,
ADD COLUMN     "sessionGoalType" "SessionGoalType",
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN     "targetChapters" INTEGER,
ADD COLUMN     "targetScenes" INTEGER,
ADD COLUMN     "targetWordCount" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
ALTER COLUMN "link" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProjectWordLog" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "wordsAdded" INTEGER NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectWordLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectProgressLog" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "chaptersAdded" INTEGER NOT NULL DEFAULT 0,
    "scenesAdded" INTEGER NOT NULL DEFAULT 0,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSessionLog" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectWordLog_projectId_idx" ON "ProjectWordLog"("projectId");

-- CreateIndex
CREATE INDEX "ProjectWordLog_loggedAt_idx" ON "ProjectWordLog"("loggedAt");

-- CreateIndex
CREATE INDEX "ProjectProgressLog_projectId_idx" ON "ProjectProgressLog"("projectId");

-- CreateIndex
CREATE INDEX "ProjectProgressLog_loggedAt_idx" ON "ProjectProgressLog"("loggedAt");

-- CreateIndex
CREATE INDEX "ProjectSessionLog_projectId_idx" ON "ProjectSessionLog"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSessionLog_loggedAt_idx" ON "ProjectSessionLog"("loggedAt");

-- CreateIndex
CREATE INDEX "GroupSprint_visibility_idx" ON "GroupSprint"("visibility");

-- CreateIndex
CREATE INDEX "Project_visibility_idx" ON "Project"("visibility");

-- AddForeignKey
ALTER TABLE "ProjectWordLog" ADD CONSTRAINT "ProjectWordLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProgressLog" ADD CONSTRAINT "ProjectProgressLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSessionLog" ADD CONSTRAINT "ProjectSessionLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
