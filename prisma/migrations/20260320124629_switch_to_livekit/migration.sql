/*
  Warnings:

  - You are about to drop the column `dailyRoomName` on the `GroupSprint` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GroupSprint" DROP COLUMN "dailyRoomName",
ADD COLUMN     "liveKitRoomName" TEXT;
