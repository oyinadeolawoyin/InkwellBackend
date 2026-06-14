-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "BlogPost_isPinned_idx" ON "BlogPost"("isPinned");
