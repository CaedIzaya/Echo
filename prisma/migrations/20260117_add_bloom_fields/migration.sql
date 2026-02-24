ALTER TABLE "User" ADD COLUMN "lastLevelUpBloomAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastWeeklyBloomAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastWeeklyBloomWeek" TEXT;

