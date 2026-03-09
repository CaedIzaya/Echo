import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calculateSessionQuality({
  sessionMinutes,
  rating,
  dailyGoalMinutes,
  completedDailyGoal,
}) {
  const normalizedRating = clamp(rating / 3, 0, 1);
  const goalReference =
    dailyGoalMinutes && dailyGoalMinutes > 0 ? dailyGoalMinutes : Math.max(sessionMinutes, 20);
  const durationFactor = clamp(sessionMinutes / goalReference, 0, 1);
  const completionFactor = completedDailyGoal
    ? 1
    : clamp(sessionMinutes / Math.max(goalReference * 0.6, 1), 0, 1);

  return normalizedRating * 0.45 + durationFactor * 0.35 + completionFactor * 0.2;
}

function computeSessionFlowIndex(session) {
  const safeMinutes = Math.max(0, session.duration || 0);
  const safeRating =
    typeof session.rating === "number" && Number.isFinite(session.rating)
      ? clamp(session.rating, 1, 3)
      : 2;
  const safeGoalMinutes =
    typeof session.goalMinutes === "number" &&
    Number.isFinite(session.goalMinutes) &&
    session.goalMinutes > 0
      ? session.goalMinutes
      : 30;
  const completedGoal =
    typeof session.isMinMet === "boolean" ? session.isMinMet : safeMinutes >= safeGoalMinutes;

  const quality = calculateSessionQuality({
    sessionMinutes: safeMinutes,
    rating: safeRating,
    dailyGoalMinutes: safeGoalMinutes,
    completedDailyGoal: completedGoal,
  });

  const interruptionSignals = [
    session.hadDistraction,
    session.hadTabHide,
    session.hadIdle,
    session.hadRapidSwitch,
  ].filter(Boolean).length;
  const safeResumeCount =
    typeof session.resumeCount === "number" && Number.isFinite(session.resumeCount)
      ? Math.max(0, session.resumeCount)
      : 0;
  const interruptionPenalty = interruptionSignals * 7 + Math.min(safeResumeCount, 4) * 2;
  const enduranceBonus = clamp((safeMinutes - 15) * 0.4, 0, 14);
  const completionBonus = completedGoal ? 8 : safeMinutes >= safeGoalMinutes * 0.6 ? 2 : -6;
  const rawScore = quality * 100 + enduranceBonus + completionBonus - interruptionPenalty;

  return Math.round(clamp(rawScore, 0, 100));
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function backfillUser(user) {
  const [sessions, activities, userSessions] = await Promise.all([
    prisma.focusSession.findMany({
      where: { userId: user.id },
      orderBy: { startTime: "asc" },
      select: {
        startTime: true,
        duration: true,
        rating: true,
        goalMinutes: true,
        isMinMet: true,
        hadDistraction: true,
        hadTabHide: true,
        hadIdle: true,
        hadRapidSwitch: true,
        resumeCount: true,
      },
    }),
    prisma.dailyUserActivity.findMany({
      where: { userId: user.id },
      select: {
        dateKey: true,
        active: true,
        qualityActive: true,
      },
    }),
    prisma.userSession.findMany({
      where: { userId: user.id },
      select: { dateKey: true },
    }),
  ]);

  const byDate = new Map();

  for (const session of sessions) {
    const dateKey = toDateKey(session.startTime);
    const existing = byDate.get(dateKey) ?? {
      focusMinutes: 0,
      focusSessionCount: 0,
      qualifiedSessionCount: 0,
      qualifiedDay: false,
      companionDay: false,
      flowScoreSum: 0,
      flowScoreCount: 0,
      firstFocusAt: null,
      lastFocusAt: null,
    };

    const score = computeSessionFlowIndex(session);
    existing.focusMinutes += session.duration || 0;
    existing.focusSessionCount += 1;
    existing.qualifiedSessionCount += session.isMinMet ? 1 : 0;
    existing.qualifiedDay = existing.qualifiedDay || !!session.isMinMet;
    existing.companionDay = true;
    existing.flowScoreSum += score;
    existing.flowScoreCount += 1;
    existing.firstFocusAt =
      !existing.firstFocusAt || session.startTime < existing.firstFocusAt
        ? session.startTime
        : existing.firstFocusAt;
    existing.lastFocusAt =
      !existing.lastFocusAt || session.startTime > existing.lastFocusAt
        ? session.startTime
        : existing.lastFocusAt;

    byDate.set(dateKey, existing);
  }

  for (const activity of activities) {
    const existing = byDate.get(activity.dateKey) ?? {
      focusMinutes: 0,
      focusSessionCount: 0,
      qualifiedSessionCount: 0,
      qualifiedDay: false,
      companionDay: false,
      flowScoreSum: 0,
      flowScoreCount: 0,
      firstFocusAt: null,
      lastFocusAt: null,
    };
    existing.companionDay = true;
    existing.qualifiedDay = existing.qualifiedDay || !!activity.qualityActive;
    byDate.set(activity.dateKey, existing);
  }

  for (const session of userSessions) {
    const existing = byDate.get(session.dateKey) ?? {
      focusMinutes: 0,
      focusSessionCount: 0,
      qualifiedSessionCount: 0,
      qualifiedDay: false,
      companionDay: false,
      flowScoreSum: 0,
      flowScoreCount: 0,
      firstFocusAt: null,
      lastFocusAt: null,
    };
    existing.companionDay = true;
    byDate.set(session.dateKey, existing);
  }

  let upserted = 0;
  for (const [dateKey, stats] of byDate.entries()) {
    await prisma.dailyFocusStats.upsert({
      where: { userId_dateKey: { userId: user.id, dateKey } },
      update: {
        focusMinutes: stats.focusMinutes,
        focusSessionCount: stats.focusSessionCount,
        qualifiedSessionCount: stats.qualifiedSessionCount,
        qualifiedDay: stats.qualifiedDay,
        companionDay: stats.companionDay,
        flowScoreSum: stats.flowScoreSum,
        flowScoreCount: stats.flowScoreCount,
        flowScoreAvg: stats.flowScoreCount > 0 ? stats.flowScoreSum / stats.flowScoreCount : null,
        firstFocusAt: stats.firstFocusAt,
        lastFocusAt: stats.lastFocusAt,
      },
      create: {
        userId: user.id,
        dateKey,
        focusMinutes: stats.focusMinutes,
        focusSessionCount: stats.focusSessionCount,
        qualifiedSessionCount: stats.qualifiedSessionCount,
        qualifiedDay: stats.qualifiedDay,
        companionDay: stats.companionDay,
        flowScoreSum: stats.flowScoreSum,
        flowScoreCount: stats.flowScoreCount,
        flowScoreAvg: stats.flowScoreCount > 0 ? stats.flowScoreSum / stats.flowScoreCount : null,
        firstFocusAt: stats.firstFocusAt,
        lastFocusAt: stats.lastFocusAt,
      },
    });
    upserted += 1;
  }

  console.log(`已回填 ${user.email || user.id}: ${upserted} 天`);
}

async function main() {
  const userId = process.argv[2] || null;
  const users = await prisma.user.findMany({
    where: userId ? { id: userId } : undefined,
    select: {
      id: true,
      email: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) {
    console.log("没有找到需要回填的用户");
    return;
  }

  console.log(`开始回填 DailyFocusStats，共 ${users.length} 个用户`);
  for (const user of users) {
    await backfillUser(user);
  }
  console.log("回填完成");
}

main()
  .catch((error) => {
    console.error("回填失败:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
