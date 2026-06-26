-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL', 'REACTION', 'COMMENT', 'CRITIQUE', 'MESSAGE', 'COMMUNITY_UPDATE', 'SYSTEM');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "Notification_userId_type_idx" ON "Notification"("userId", "type");
