-- AlterTable
ALTER TABLE "User" ADD COLUMN "echoCompanionDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastEchoCompanionDate" TEXT;
