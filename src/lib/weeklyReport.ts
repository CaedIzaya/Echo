import { db } from "~/server/db";
import type { WeeklyReport } from "@prisma/client";
import { LevelManager } from "~/lib/LevelSystem";
import { expToNextLevel } from "~/lib/HeartTreeExpSystem";

const WEEKLY_REPORT_TTL_DAYS = 84; // 12 周

export type DailyPoint = {
  date: string; // YYYY-MM-DD
  minutes: number;
  flowIndex: number | null;
  note: string | null;
};

export type WeeklyReportPayload = {
  period: {
    start: string;
    end: string;
    label: string;
  };
  user: {
    id: string;
    name?: string | null;
    image?: string | null;
  };
  totals: {
    minutes: number;
    prevWeekMinutes: number;
    wowChange: number | null;
    streakDays: number;
    prevWeekStreakDays: number;
    isNewStreakRecord: boolean;
    flowAvg: number | null;
    flowDelta: number | null;
    expTotal: number;
    treeExp: number | null;
    selfExp: number | null;
    userLevelUp: number;
    heartTreeLevelUp: number;
  };
  bestDay?: {
    date: string;
    minutes: number;
    note: string | null;
  };
  daily: DailyPoint[];
  summaries: { date: string; text: string }[];
  generatedAt: string;
};

type Options = {
  referenceDate?: Date;
  persist?: boolean;
};

export function getWeekRange(referenceDate = new Date()) {
  // 🔥 使用用户本地时区计算周期（周一00:00 - 周日23:59）
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const day = ref.getDay(); // 0 (Sun) - 6 (Sat)
  const mondayOffset = day === 0 ? -6 : 1 - day;
  
  // 周一 00:00:00
  const start = new Date(ref);
  start.setDate(ref.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  // 周日 23:59:59.999（从周一开始+6天）
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  // 🔥 详细日志，方便确认日期区间
  console.log(`[getWeekRange] 📅 周期计算:`, {
    参考日期: formatDateKey(ref),
    周一: formatDateKey(start),
    周日: formatDateKey(end),
    标签: formatLabel(start, end),
  });

  return { start, end };
}

export async function computeWeeklyReport(
  userId: string,
  options?: Options,
): Promise<WeeklyReportPayload> {
  const referenceDate = options?.referenceDate ?? new Date();
  const { start: weekStart, end: weekEnd } = getWeekRange(referenceDate);

  const prevStart = new Date(weekStart);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(weekStart);
  prevEnd.setMilliseconds(-1);

  const weekDates = getWeekDates(weekStart);

  const [user, sessions, prevSessions, summaries, lastSummaries] =
    await Promise.all([
      db.user.findUnique({ where: { id: userId } }),
      db.focusSession.findMany({
        where: { userId, startTime: { gte: weekStart, lte: weekEnd } },
        select: {
          startTime: true,
          duration: true,
          flowIndex: true,
          rating: true,
          expEarned: true,
        },
      }),
      db.focusSession.findMany({
        where: { userId, startTime: { gte: prevStart, lte: prevEnd } },
        select: {
          startTime: true,
          duration: true,
          flowIndex: true,
          rating: true,
          expEarned: true,
        },
      }),
      db.dailySummary.findMany({
        where: { userId, date: { in: weekDates } },
        select: { date: true, text: true },
      }),
      db.dailySummary.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 10,  // 🔥 增加到10条，确保上周数据能完整保存
        select: { date: true, text: true },
      }),
    ]);

  // 用户验证
  if (!user) {
    console.error(`[computeWeeklyReport] 用户不存在: userId=${userId}`);
    throw new Error("用户不存在");
  }

  // 第一周保护机制：注册未满7天的用户不生成周报
  if (user.createdAt) {
    const daysSinceRegistration = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(`[computeWeeklyReport] 用户注册天数: ${daysSinceRegistration}天, userId=${userId}`);
    
    if (daysSinceRegistration < 7) {
      console.warn(`[computeWeeklyReport] 注册时间不足7天: userId=${userId}, days=${daysSinceRegistration}`);
      throw new Error(
        `注册时间不足7天（当前${daysSinceRegistration}天），暂不生成周报。继续专注吧，第二周将为你生成第一份周报！`
      );
    }
  }

  // 🔥 详细的数据验证日志（包括日期区间）
  console.log(`[computeWeeklyReport] ==================== 周报数据生成 ====================`);
  console.log(`[computeWeeklyReport] 用户ID: ${userId}`);
  console.log(`[computeWeeklyReport] 📅 周期范围（用户本地时区）:`);
  console.log(`[computeWeeklyReport]    开始: ${formatDateKey(weekStart)} (周一)`);
  console.log(`[computeWeeklyReport]    结束: ${formatDateKey(weekEnd)} (周日)`);
  console.log(`[computeWeeklyReport]    标签: ${formatLabel(weekStart, weekEnd)}`);
  console.log(`[computeWeeklyReport] 📊 数据统计:`);
  console.log(`[computeWeeklyReport]    本周专注记录: ${sessions.length} 条`);
  console.log(`[computeWeeklyReport]    上周专注记录: ${prevSessions.length} 条`);
  console.log(`[computeWeeklyReport]    每日小结: ${summaries.length} 条`);
  console.log(`[computeWeeklyReport] 📆 7天日期列表:`, weekDates);

  const summaryMap = new Map<string, string>();
  summaries.forEach((s) => summaryMap.set(s.date, s.text));

  const daily = weekDates.map((date) => {
    const daySessions = sessions.filter(
      (s) => formatDateKey(s.startTime) === date,
    );
    const minutes = daySessions.reduce((sum, s) => sum + (s.duration ?? 0), 0);
    const flowAvg =
      daySessions.length > 0
        ? Math.round(
            daySessions.reduce(
              (sum, s) => sum + (s.flowIndex ?? s.rating ?? 0),
              0,
            ) / daySessions.length,
          )
        : null;
    
    // 🔥 每日数据日志
    if (minutes > 0 || flowAvg !== null) {
      console.log(`[computeWeeklyReport]    ${date}: ${minutes}分钟, 心流${flowAvg || 'N/A'}`);
    }
    
    return {
      date,
      minutes,
      flowIndex: flowAvg ?? null,
      note: summaryMap.get(date) ?? null,
    };
  });
  
  console.log(`[computeWeeklyReport] ========================================================`);

  const totals = calcTotals(sessions);
  const prevTotals = calcTotals(prevSessions);
  const prevWeekMinutes = prevTotals.minutes;
  const wowChange =
    prevTotals.minutes > 0
      ? (totals.minutes - prevTotals.minutes) / prevTotals.minutes
      : undefined;
  const flowDelta =
    prevTotals.flowAvg && totals.flowAvg
      ? totals.flowAvg - prevTotals.flowAvg
      : undefined;

  const bestDay = daily.reduce(
    (acc, cur) => (cur.minutes > (acc?.minutes ?? 0) ? cur : acc),
    undefined as DailyPoint | undefined,
  );

  const streakDays = calcStreak(daily);
  const prevWeekDaily = buildDailyFromSessions(prevSessions, prevStart);
  const prevWeekStreakDays = calcStreak(prevWeekDaily);
  const isNewStreakRecord =
    streakDays > 0 && streakDays > prevWeekStreakDays;
  const { treeExp, selfExp } = splitExp(totals.expTotal ?? 0);
  const userLevelUp = calcUserLevelUpFromWeeklyExp(selfExp);
  const heartTreeLevelUp = calcHeartTreeLevelUpFromWeeklyExp(treeExp);

  const payload: WeeklyReportPayload = {
    period: {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      label: formatLabel(weekStart, weekEnd),
    },
    user: {
      id: userId,
      name: user?.name ?? null,
      image: user?.image ?? null,
    },
    totals: {
      minutes: totals.minutes,
      prevWeekMinutes,
      wowChange: wowChange ?? null,
      streakDays,
      prevWeekStreakDays,
      isNewStreakRecord,
      flowAvg: totals.flowAvg ?? null,
      flowDelta: flowDelta ?? null,
      expTotal: totals.expTotal ?? 0,
      treeExp,
      selfExp,
      userLevelUp,
      heartTreeLevelUp,
    },
    bestDay:
      bestDay && bestDay.minutes > 0
        ? {
            date: bestDay.date,
            minutes: bestDay.minutes,
            note: bestDay.note ?? null,
          }
        : undefined,
    daily,
    summaries: lastSummaries.map((s) => ({ date: s.date, text: s.text })),
    generatedAt: new Date().toISOString(),
  };

  if (options?.persist !== false) {
    await persistWeekly(userId, payload, weekStart, weekEnd);
  }

  return payload;
}

function buildDailyFromSessions(
  sessions: { startTime: Date; duration: number | null; flowIndex: number | null; rating: number | null }[],
  weekStart: Date,
): DailyPoint[] {
  const weekDates = getWeekDates(weekStart);
  return weekDates.map((date) => {
    const daySessions = sessions.filter((s) => formatDateKey(s.startTime) === date);
    const minutes = daySessions.reduce((sum, s) => sum + (s.duration ?? 0), 0);
    const flowAvg =
      daySessions.length > 0
        ? Math.round(
            daySessions.reduce(
              (sum, s) => sum + (s.flowIndex ?? s.rating ?? 0),
              0,
            ) / daySessions.length,
          )
        : null;
    return { date, minutes, flowIndex: flowAvg ?? null, note: null };
  });
}

function calcUserLevelUpFromWeeklyExp(exp: number | null) {
  const total = exp ?? 0;
  if (total <= 0) return 0;
  // SSR 侧无法可靠获取“历史总 EXP”，这里用保守规则：按 Lv1 的经验门槛估算本周可提升的等级数
  const perLevel = LevelManager.getExpRequiredForLevel(1);
  return Math.max(0, Math.floor(total / perLevel));
}

function calcHeartTreeLevelUpFromWeeklyExp(exp: number | null) {
  const total = exp ?? 0;
  if (total <= 0) return 0;
  // 同理：以 Lv1 开始逐级扣除，估算本周心树提升等级数（V1 心树等级上限较低，估算结果直观）
  let level = 1;
  let remaining = total;
  let ups = 0;
  while (level < 10) {
    const need = expToNextLevel(level);
    if (!Number.isFinite(need)) break;
    if (remaining < need) break;
    remaining -= need;
    level += 1;
    ups += 1;
  }
  return ups;
}

async function persistWeekly(
  userId: string,
  payload: WeeklyReportPayload,
  weekStart: Date,
  weekEnd: Date,
): Promise<WeeklyReport> {
  try {
    const expiresAt = new Date(weekEnd);
    expiresAt.setDate(expiresAt.getDate() + WEEKLY_REPORT_TTL_DAYS);
    
    console.log(`[persistWeekly] 开始保存周报: userId=${userId}, weekStart=${weekStart.toISOString()}`);
    
    const result = await db.weeklyReport.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      update: {
        weekEnd,
        totalMinutes: payload.totals.minutes,
        wowChange: payload.totals.wowChange,
        streakDays: payload.totals.streakDays,
        bestDay: payload.bestDay ? new Date(payload.bestDay.date) : null,
        bestDayNote: payload.bestDay?.note,
        flowAvg: payload.totals.flowAvg,
        flowDelta: payload.totals.flowDelta,
        expTotal: payload.totals.expTotal,
        payloadJson: payload,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId,
        weekStart,
        weekEnd,
        totalMinutes: payload.totals.minutes,
        wowChange: payload.totals.wowChange,
        streakDays: payload.totals.streakDays,
        bestDay: payload.bestDay ? new Date(payload.bestDay.date) : null,
        bestDayNote: payload.bestDay?.note,
        flowAvg: payload.totals.flowAvg,
        flowDelta: payload.totals.flowDelta,
        expTotal: payload.totals.expTotal,
        payloadJson: payload,
        expiresAt,
      },
    });
    
    console.log(`[persistWeekly] 周报保存成功: reportId=${result.id}`);
    return result;
  } catch (error: any) {
    console.error("[persistWeekly] 保存周报失败:", {
      userId,
      weekStart: weekStart.toISOString(),
      error: error?.message || error,
      stack: error?.stack,
    });
    throw new Error(`周报保存失败: ${error?.message || "未知错误"}`);
  }
}

function calcTotals(
  sessions: {
    duration: number | null;
    flowIndex: number | null;
    rating: number | null;
    expEarned: number | null;
  }[],
) {
  const minutes = sessions.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const flowSum = sessions.reduce(
    (sum, s) => sum + (s.flowIndex ?? s.rating ?? 0),
    0,
  );
  const flowAvg =
    sessions.length > 0 ? Math.round(flowSum / sessions.length) : null;
  const expTotal = sessions.reduce((sum, s) => sum + (s.expEarned ?? 0), 0);
  return { minutes, flowAvg, expTotal };
}

function calcStreak(daily: DailyPoint[]) {
  let streak = 0;
  daily.forEach((d) => {
    if (d.minutes > 0) {
      streak += 1;
    } else {
      streak = 0;
    }
  });
  return streak;
}

function splitExp(total: number) {
  const treeExp = Math.round(total * 0.6);
  const selfExp = total - treeExp;
  return { treeExp, selfExp };
}

function formatLabel(start: Date, end: Date) {
  const fmt = (d: Date) =>
    `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

function pad(num: number) {
  return num.toString().padStart(2, "0");
}

function getWeekDates(weekStart: Date) {
  const dates: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    dates.push(formatDateKey(day));
  }
  return dates;
}

export function formatDateKey(date: Date) {
  // 🔥 修复：使用用户本地时区，而不是 UTC
  // toISOString() 会导致时区偏移问题
  const local = new Date(date);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

