-- Weekly report v2: session-level low-precision behavior summary fields
ALTER TABLE "FocusSession" ADD COLUMN "deviceType" TEXT;
ALTER TABLE "FocusSession" ADD COLUMN "timeBucket" TEXT;
ALTER TABLE "FocusSession" ADD COLUMN "startHourBucket" TEXT;
ALTER TABLE "FocusSession" ADD COLUMN "sessionLengthBucket" TEXT;
ALTER TABLE "FocusSession" ADD COLUMN "hadDistraction" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FocusSession" ADD COLUMN "hadTabHide" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FocusSession" ADD COLUMN "hadIdle" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FocusSession" ADD COLUMN "hadRapidSwitch" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FocusSession" ADD COLUMN "resumeCount" INTEGER NOT NULL DEFAULT 0;
