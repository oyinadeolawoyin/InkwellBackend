-- CreateEnum
CREATE TYPE "SprintType" AS ENUM ('WRITING', 'READING');

-- AlterTable
ALTER TABLE "GroupSprint" ADD COLUMN     "sprintType" "SprintType" NOT NULL DEFAULT 'WRITING';

-- AlterTable
ALTER TABLE "Sprint" ADD COLUMN     "projectId" INTEGER;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
