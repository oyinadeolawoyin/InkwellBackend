/*
  Warnings:

  - You are about to drop the column `soundscape` on the `GroupSprint` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GroupSprint" DROP COLUMN "soundscape";

-- AlterTable
ALTER TABLE "Sprint" ADD COLUMN     "soundscapeId" INTEGER;

-- CreateTable
CREATE TABLE "Soundscape" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "creatorName" TEXT,
    "fileUrl" TEXT NOT NULL,
    "contributedBy" INTEGER NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Soundscape_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Soundscape_contributedBy_idx" ON "Soundscape"("contributedBy");

-- CreateIndex
CREATE INDEX "Soundscape_isApproved_idx" ON "Soundscape"("isApproved");

-- CreateIndex
CREATE INDEX "Sprint_soundscapeId_idx" ON "Sprint"("soundscapeId");

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_soundscapeId_fkey" FOREIGN KEY ("soundscapeId") REFERENCES "Soundscape"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soundscape" ADD CONSTRAINT "Soundscape_contributedBy_fkey" FOREIGN KEY ("contributedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
