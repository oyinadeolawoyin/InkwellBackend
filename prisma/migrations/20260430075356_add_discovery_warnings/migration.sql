-- AlterTable
ALTER TABLE "DiscoveryStory" ADD COLUMN     "contentWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "firstChapterTitle" TEXT;
