import { db } from "~/server/db";

const MAX_HISTORY_ITEMS = 200;
const RECENT_POOL_SIZE = 100;
const FREQUENT_POOL_SIZE = 100;

export const MICRO_GOAL_LIMITS = {
  MAX_HISTORY_ITEMS,
  RECENT_POOL_SIZE,
  FREQUENT_POOL_SIZE,
} as const;

function isMissingMicroGoalTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  );
}

export type MicroGoalHistoryItem = {
  id: string;
  text: string;
  usageCount: number;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
};

function normalizeMicroGoalText(text: string) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function cleanupMicroGoalText(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function toClientItem(item: {
  id: string;
  rawText: string;
  usageCount: number;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): MicroGoalHistoryItem {
  return {
    id: item.id,
    text: item.rawText,
    usageCount: item.usageCount,
    lastUsedAt: item.lastUsedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function buildRecentAndFrequentPools<
  T extends { id: string; usageCount: number; lastUsedAt: Date }
>(items: T[]) {
  const recent = [...items]
    .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
    .slice(0, RECENT_POOL_SIZE);

  const frequent = [...items]
    .sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
    })
    .slice(0, FREQUENT_POOL_SIZE);

  return { recent, frequent };
}

async function pruneMicroGoalHistory(userId: string) {
  let all: Array<{ id: string; usageCount: number; lastUsedAt: Date }> = [];
  try {
    all = await db.microGoalHistory.findMany({
      where: { userId },
      select: {
        id: true,
        usageCount: true,
        lastUsedAt: true,
      },
    });
  } catch (error) {
    if (isMissingMicroGoalTableError(error)) return;
    throw error;
  }

  if (all.length <= MAX_HISTORY_ITEMS) return;

  const { recent, frequent } = buildRecentAndFrequentPools(all);
  const keepIds = new Set<string>([...recent, ...frequent].map((item) => item.id));

  if (keepIds.size >= all.length) return;

  await db.microGoalHistory.deleteMany({
    where: {
      userId,
      id: {
        notIn: Array.from(keepIds),
      },
    },
  });
}

export async function trackMicroGoalUsage(userId: string, text: string) {
  const cleanedText = cleanupMicroGoalText(text);
  const normalizedText = normalizeMicroGoalText(cleanedText);
  if (!cleanedText || !normalizedText) return;

  try {
    await db.microGoalHistory.upsert({
      where: {
        userId_normalizedText: {
          userId,
          normalizedText,
        },
      },
      create: {
        userId,
        rawText: cleanedText,
        normalizedText,
        usageCount: 1,
        lastUsedAt: new Date(),
      },
      update: {
        rawText: cleanedText,
        usageCount: {
          increment: 1,
        },
        lastUsedAt: new Date(),
      },
    });
  } catch (error) {
    if (isMissingMicroGoalTableError(error)) return;
    throw error;
  }

  await pruneMicroGoalHistory(userId);
}

export async function trackMicroGoalUsageBatch(userId: string, titles: string[]) {
  const unique = Array.from(
    new Set(
      titles
        .map((item) => cleanupMicroGoalText(item))
        .filter(Boolean)
    )
  );

  for (const title of unique) {
    await trackMicroGoalUsage(userId, title);
  }
}

export async function getMicroGoalHistory(userId: string, topN = 8) {
  let all: Array<{
    id: string;
    rawText: string;
    usageCount: number;
    lastUsedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  try {
    all = await db.microGoalHistory.findMany({
      where: { userId },
      select: {
        id: true,
        rawText: true,
        usageCount: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (isMissingMicroGoalTableError(error)) {
      return {
        recent: [],
        frequent: [],
        total: 0,
      };
    }
    throw error;
  }

  const { recent, frequent } = buildRecentAndFrequentPools(all);

  return {
    recent: recent.slice(0, topN).map(toClientItem),
    frequent: frequent.slice(0, topN).map(toClientItem),
    total: all.length,
  };
}

export async function renameMicroGoalHistoryItem(
  userId: string,
  itemId: string,
  nextText: string
) {
  const cleanedText = cleanupMicroGoalText(nextText);
  const normalizedText = normalizeMicroGoalText(cleanedText);
  if (!cleanedText || !normalizedText) {
    throw new Error("INVALID_TEXT");
  }

  let current = null;
  try {
    current = await db.microGoalHistory.findFirst({
      where: { id: itemId, userId },
    });
  } catch (error) {
    if (isMissingMicroGoalTableError(error)) {
      throw new Error("NOT_FOUND");
    }
    throw error;
  }
  if (!current) {
    throw new Error("NOT_FOUND");
  }

  const duplicate = await db.microGoalHistory.findFirst({
    where: {
      userId,
      normalizedText,
      id: { not: itemId },
    },
  });

  if (!duplicate) {
    const updated = await db.microGoalHistory.update({
      where: { id: itemId },
      data: {
        rawText: cleanedText,
        normalizedText,
        lastUsedAt: new Date(),
      },
      select: {
        id: true,
        rawText: true,
        usageCount: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return toClientItem(updated);
  }

  const merged = await db.microGoalHistory.update({
    where: { id: duplicate.id },
    data: {
      rawText: cleanedText,
      usageCount: {
        increment: current.usageCount,
      },
      lastUsedAt:
        current.lastUsedAt.getTime() > duplicate.lastUsedAt.getTime()
          ? current.lastUsedAt
          : duplicate.lastUsedAt,
    },
    select: {
      id: true,
      rawText: true,
      usageCount: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await db.microGoalHistory.delete({
    where: { id: itemId },
  });

  return toClientItem(merged);
}

export async function deleteMicroGoalHistoryItem(userId: string, itemId: string) {
  try {
    await db.microGoalHistory.deleteMany({
      where: {
        id: itemId,
        userId,
      },
    });
  } catch (error) {
    if (isMissingMicroGoalTableError(error)) return;
    throw error;
  }
}

export async function clearMicroGoalHistory(userId: string) {
  try {
    await db.microGoalHistory.deleteMany({
      where: { userId },
    });
  } catch (error) {
    if (isMissingMicroGoalTableError(error)) return;
    throw error;
  }
}

