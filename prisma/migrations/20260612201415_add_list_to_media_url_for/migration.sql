/*
  Warnings:

  - The `mediaUrl` column on the `ThreadComment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `mediaUrl` column on the `ThreadReply` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ThreadComment" DROP COLUMN "mediaUrl",
ADD COLUMN     "mediaUrl" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "ThreadReply" DROP COLUMN "mediaUrl",
ADD COLUMN     "mediaUrl" JSONB NOT NULL DEFAULT '[]';
