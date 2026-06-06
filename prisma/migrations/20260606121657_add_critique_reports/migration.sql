-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "CritiqueReport" (
    "id" SERIAL NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "responseId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolverId" INTEGER,
    "adminNotes" TEXT,

    CONSTRAINT "CritiqueReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CritiqueReport_responseId_idx" ON "CritiqueReport"("responseId");

-- CreateIndex
CREATE INDEX "CritiqueReport_reporterId_idx" ON "CritiqueReport"("reporterId");

-- CreateIndex
CREATE INDEX "CritiqueReport_status_idx" ON "CritiqueReport"("status");

-- CreateIndex
CREATE INDEX "CritiqueReport_createdAt_idx" ON "CritiqueReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CritiqueReport_reporterId_responseId_key" ON "CritiqueReport"("reporterId", "responseId");

-- AddForeignKey
ALTER TABLE "CritiqueReport" ADD CONSTRAINT "CritiqueReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CritiqueReport" ADD CONSTRAINT "CritiqueReport_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "FeedbackResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CritiqueReport" ADD CONSTRAINT "CritiqueReport_resolverId_fkey" FOREIGN KEY ("resolverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
