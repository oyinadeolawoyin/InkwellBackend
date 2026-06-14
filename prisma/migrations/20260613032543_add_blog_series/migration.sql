-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "seriesId" INTEGER,
ADD COLUMN     "seriesOrder" INTEGER;

-- CreateTable
CREATE TABLE "BlogSeries" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogSeries_slug_key" ON "BlogSeries"("slug");

-- CreateIndex
CREATE INDEX "BlogSeries_slug_idx" ON "BlogSeries"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_seriesId_idx" ON "BlogPost"("seriesId");

-- CreateIndex
CREATE INDEX "BlogPost_seriesId_seriesOrder_idx" ON "BlogPost"("seriesId", "seriesOrder");

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "BlogSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
