-- CreateTable
CREATE TABLE "SprintReminderOptIn" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "optedIn" BOOLEAN NOT NULL DEFAULT true,
    "reminderMinutesBefore" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SprintReminderOptIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SprintReminderOptIn_userId_key" ON "SprintReminderOptIn"("userId");

-- CreateIndex
CREATE INDEX "SprintReminderOptIn_optedIn_idx" ON "SprintReminderOptIn"("optedIn");

-- AddForeignKey
ALTER TABLE "SprintReminderOptIn" ADD CONSTRAINT "SprintReminderOptIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
