-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "categoryId" INTEGER;

-- CreateTable
CREATE TABLE "ThreadCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreadCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThreadCategory_name_key" ON "ThreadCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadCategory_slug_key" ON "ThreadCategory"("slug");

-- CreateIndex
CREATE INDEX "ThreadCategory_sortOrder_idx" ON "ThreadCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "ThreadCategory_slug_idx" ON "ThreadCategory"("slug");

-- CreateIndex
CREATE INDEX "Thread_categoryId_idx" ON "Thread"("categoryId");

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ThreadCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
