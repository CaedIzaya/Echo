CREATE TABLE "MicroGoalHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MicroGoalHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MicroGoalHistory_userId_normalizedText_key" ON "MicroGoalHistory"("userId", "normalizedText");
CREATE INDEX "MicroGoalHistory_userId_lastUsedAt_idx" ON "MicroGoalHistory"("userId", "lastUsedAt");
CREATE INDEX "MicroGoalHistory_userId_usageCount_idx" ON "MicroGoalHistory"("userId", "usageCount");
