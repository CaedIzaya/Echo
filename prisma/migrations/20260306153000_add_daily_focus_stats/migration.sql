CREATE TABLE "DailyFocusStats" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "focusMinutes" INTEGER NOT NULL DEFAULT 0,
  "focusSessionCount" INTEGER NOT NULL DEFAULT 0,
  "qualifiedSessionCount" INTEGER NOT NULL DEFAULT 0,
  "qualifiedDay" BOOLEAN NOT NULL DEFAULT false,
  "companionDay" BOOLEAN NOT NULL DEFAULT false,
  "flowScoreSum" INTEGER NOT NULL DEFAULT 0,
  "flowScoreCount" INTEGER NOT NULL DEFAULT 0,
  "flowScoreAvg" REAL,
  "firstFocusAt" TIMESTAMP,
  "lastFocusAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyFocusStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DailyFocusStats_userId_dateKey_key" ON "DailyFocusStats"("userId", "dateKey");
CREATE INDEX "DailyFocusStats_dateKey_idx" ON "DailyFocusStats"("dateKey");
