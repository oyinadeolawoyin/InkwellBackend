/*
  Warnings:

  - You are about to drop the column `groupPurpose` on the `GroupSprint` table. All the data in the column will be lost.
  - You are about to drop the column `groupThankNote` on the `GroupSprint` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GroupSprint" DROP COLUMN "groupPurpose",
DROP COLUMN "groupThankNote",
ADD COLUMN     "totalWordsWritten" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Sprint" ADD COLUMN     "deletedWords" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "startWords" SET DEFAULT 0;
