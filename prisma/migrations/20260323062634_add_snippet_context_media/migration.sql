/*
  Warnings:

  - You are about to drop the column `content` on the `WritingSnippet` table. All the data in the column will be lost.
  - You are about to drop the column `proudOf` on the `WritingSnippet` table. All the data in the column will be lost.
  - You are about to drop the column `struggle` on the `WritingSnippet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WritingSnippet" DROP COLUMN "content",
DROP COLUMN "proudOf",
DROP COLUMN "struggle",
ADD COLUMN     "context" TEXT,
ADD COLUMN     "mediaUrl" TEXT;
