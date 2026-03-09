import type { Prisma, PrismaClient } from "@prisma/client";
import { computeSessionFlowIndex } from "~/lib/flowEngine";

type DailyFocusStatsClient = PrismaClient | Prisma.TransactionClient;
type DailyFocusStatsDelegate = {
  findMany: (args: unknown) => Promise<DailyFocusStatsRecord[]>;
  upsert: (args: unknown) => Promise<unknown>;
};

type FocusSessionForStats = {
  startTime: Date;
  duration: number | null;
  rating: number | null;
  flowIndex: number | null;
  goalMinutes: number | null;
  isMinMet: boolean | null;
  hadDistraction: boolean;
  hadTabHide: boolean;
  hadIdle: boolean;
  hadRapidSwitch: boolean;
  resumeCount: number;
};

export type DailyFocusStatsRecord = {
  dateKey: string;
  focusMinutes: number;
  focusSessionCount: number;
  qualifiedDay: boolean;
  companionDay: boolean;
  flowScoreSum: number;
  flowScoreCount: number;
};

function getDailyFocusStatsDelegate(client: DailyFocusStatsClient): DailyFocusStatsDelegate {
  return (client as unknown as { dailyFocusStats: DailyFocusStatsDelegate }).dailyFocusStats;
}

function getDateBounds(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const start = new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
  const end = new Date(year, (month || 1) - 1, (day || 1) + 1, 0, 0, 0, 0);
  return { start, end };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveSessionFlowIndex(session: FocusSessionForStats) {
  return computeSessionFlowIndex({
    sessionMinutes: session.duration ?? 0,
    rating: session.rating,
    goalMinutes: session.goalMinutes,
    isMinMet: session.isMinMet,
    hadDistraction: session.hadDistraction,
    hadTabHide: session.hadTabHide,
    hadIdle: session.hadIdle,
    hadRapidSwitch: session.hadRapidSwitch,
    resumeCount: session.resumeCount,
  });
}

export async function rebuildDailyFocusStats(
  client: DailyFocusStatsClient,
  userId: string,
  dateKey: string,
) {
  const { start, end } = getDateBounds(dateKey);

  const [sessions, activity, userSession] = await Promise.all([
    client.focusSession.findMany({
      where: {
        userId,
        startTime: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { startTime: "asc" },
      select: {
        startTime: true,
        duration: true,
        rating: true,
        flowIndex: true,
        goalMinutes: true,
        isMinMet: true,
        hadDistraction: true,
        hadTabHide: true,
        hadIdle: true,
        hadRapidSwitch: true,
        resumeCount: true,
      },
    }),
    client.dailyUserActivity.findUnique({
      where: { userId_dateKey: { userId, dateKey } },
      select: {
        active: true,
        qualityActive: true,
      },
    }),
    client.userSession.findFirst({
      where: { userId, dateKey },
      select: { id: true },
    }),
  ]);

  const flowScores = sessions.map(resolveSessionFlowIndex);
  const focusMinutes = sessions.reduce((sum, session) => sum + (session.duration ?? 0), 0);
  const focusSessionCount = sessions.length;
  const qualifiedSessionCount = sessions.filter((session) => session.isMinMet).length;
  const qualifiedDay = qualifiedSessionCount > 0 || !!activity?.qualityActive;
  const companionDay = !!activity || !!userSession || focusSessionCount > 0;
  const flowScoreSum = flowScores.reduce((sum, score) => sum + score, 0);
  const flowScoreCount = flowScores.length;
  const flowScoreAvg = flowScoreCount > 0 ? flowScoreSum / flowScoreCount : null;
  const firstFocusAt = sessions[0]?.startTime ?? null;
  const lastFocusAt = sessions[sessions.length - 1]?.startTime ?? null;

  const payload = {
    focusMinutes,
    focusSessionCount,
    qualifiedSessionCount,
    qualifiedDay,
    companionDay,
    flowScoreSum,
    flowScoreCount,
    flowScoreAvg,
    firstFocusAt,
    lastFocusAt,
  };

  return getDailyFocusStatsDelegate(client).upsert({
    where: { userId_dateKey: { userId, dateKey } },
    update: payload,
    create: {
      userId,
      dateKey,
      ...payload,
    },
  });
}

export async function findDailyFocusStatsByRange(
  client: DailyFocusStatsClient,
  userId: string,
  startDateKey: string,
  endDateKey: string,
) {
  return getDailyFocusStatsDelegate(client).findMany({
    where: {
      userId,
      dateKey: {
        gte: startDateKey,
        lte: endDateKey,
      },
    },
    select: {
      dateKey: true,
      focusMinutes: true,
      focusSessionCount: true,
      qualifiedDay: true,
      companionDay: true,
      flowScoreSum: true,
      flowScoreCount: true,
    },
  });
}

export function dateKeyFromDate(date: Date) {
  return toDateKey(date);
}
