-- 添加心树开花相关字段
-- Add bloom-related fields to User table

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLevelUpBloomAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastWeeklyBloomAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastWeeklyBloomWeek" TEXT;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS "User_lastLevelUpBloomAt_idx" ON "User"("lastLevelUpBloomAt");
CREATE INDEX IF NOT EXISTS "User_lastWeeklyBloomAt_idx" ON "User"("lastWeeklyBloomAt");





































