import { db } from "~/server/db";
import type { WeeklyReport } from "@prisma/client";
import { findDailyFocusStatsByRange, type DailyFocusStatsRecord } from "~/lib/dailyFocusStats";
import { computeSessionFlowIndex } from "~/lib/flowEngine";

const WEEKLY_REPORT_TTL_DAYS = 84; // 12 周
const ANCHORED_REPORT_DAYS = 7;

type TimeBucket = "清晨" | "上午" | "下午" | "夜晚";

type WeeklySnippet = {
  id: string;
  content: string;
  dateLabel?: string;
};

type TrendDirection = "up" | "down" | "flat" | "new" | "none";
type AverageComparison = "above" | "equal" | "below" | "none";

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
  cover: {
    rhythmTitle: string;
    subtitle: string;
  };
  presence: {
    daysPresent: number;
    companionDays: number;
    qualifiedDays: number;
    totalMinutes: number;
    totalHours: number;
    flowScore: number;
    peakTime: TimeBucket;
    narrativeDayLabel: string | null;
    narrative: string;
    indicators: {
      flow: {
        value: number;
        deltaPercent: number | null;
        direction: TrendDirection;
      };
      focusDuration: {
        valueMinutes: number;
        deltaPercent: number | null;
        direction: TrendDirection;
      };
      daysPresent: {
        value: number;
        deltaDays: number | null;
        direction: TrendDirection;
      };
      streak: {
        value: number;
        deltaDays: number | null;
        direction: TrendDirection;
      };
    };
    benchmarks: {
      focusMinutes: {
        highest: number;
        average: number;
        isNewRecord: boolean;
        vsAverage: AverageComparison;
      };
      flowScore: {
        highest: number | null;
        average: number | null;
        isNewRecord: boolean;
        vsAverage: AverageComparison;
      };
    };
  };
  snippets: WeeklySnippet[];
  closingNote: string;
  generatedAt: string;
};

type Options = {
  referenceDate?: Date;
  periodStart?: Date;
  persist?: boolean;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

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

export function getAnchoredWeekRange(periodStart: Date) {
  // 🔥 基于锚点日期的周期（7天），用于“注册日-注册日”周报
  const start = startOfDay(periodStart);
  const end = addDays(start, ANCHORED_REPORT_DAYS - 1);
  end.setHours(23, 59, 59, 999);

  console.log(`[getAnchoredWeekRange] 📅 周期计算:`, {
    锚点日期: formatDateKey(start),
    周期开始: formatDateKey(start),
    周期结束: formatDateKey(end),
    标签: formatLabel(start, end),
  });

  return { start, end };
}

export async function computeWeeklyReport(
  userId: string,
  options?: Options,
): Promise<WeeklyReportPayload> {
  const referenceDate = options?.referenceDate ?? new Date();
  const { start: weekStart, end: weekEnd } = options?.periodStart
    ? getAnchoredWeekRange(options.periodStart)
    : getWeekRange(referenceDate);

  const weekDates = getWeekDates(weekStart);

  const weekStartKey = formatDateKey(weekStart);
  const weekEndKey = formatDateKey(weekEnd);

  const [user, sessions, dailyActivities, dailyFocusStats] =
    await Promise.all([
      db.user.findUnique({ where: { id: userId } }),
      db.focusSession.findMany({
        where: { userId, startTime: { gte: weekStart, lte: weekEnd } },
        select: {
          startTime: true,
          duration: true,
          flowIndex: true,
          rating: true,
          hadDistraction: true,
          hadTabHide: true,
          hadIdle: true,
          hadRapidSwitch: true,
          resumeCount: true,
          goalMinutes: true,
          isMinMet: true,
          targetMilestoneId: true,
          timeBucket: true,
          startHourBucket: true,
          sessionLengthBucket: true,
        },
      }),
      db.dailyUserActivity.findMany({
        where: {
          userId,
          dateKey: {
            gte: weekStartKey,
            lte: weekEndKey,
          },
        },
        select: {
          dateKey: true,
          active: true,
          qualityActive: true,
        },
      }),
      findDailyFocusStatsByRange(db, userId, weekStartKey, weekEndKey),
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

  const sessionsWithDerivedFlow = sessions.map((session) => ({
    ...session,
    derivedFlowIndex: computeSessionFlowIndex({
      sessionMinutes: session.duration ?? 0,
      rating: session.rating,
      goalMinutes: session.goalMinutes,
      isMinMet: session.isMinMet,
      hadDistraction: session.hadDistraction,
      hadTabHide: session.hadTabHide,
      hadIdle: session.hadIdle,
      hadRapidSwitch: session.hadRapidSwitch,
      resumeCount: session.resumeCount,
    }),
  }));
  const dailyFocusStatsMap = new Map<string, DailyFocusStatsRecord>(
    dailyFocusStats.map((item: DailyFocusStatsRecord) => [item.dateKey, item]),
  );

  const daily = weekDates.map((date) => {
    const daySessions = sessionsWithDerivedFlow.filter((s) => formatDateKey(s.startTime) === date);
    const activity = dailyActivities.find((item) => item.dateKey === date);
    const storedDailyStats = dailyFocusStatsMap.get(date);
    const fallbackFocusMinutes = daySessions.reduce(
      (sum: number, s) => sum + (s.duration ?? 0),
      0,
    );
    const fallbackSessionCount = daySessions.length;
    const fallbackQualified = daySessions.some((s) => s.isMinMet) || !!activity?.qualityActive;
    const fallbackCompanion = !!activity || fallbackSessionCount > 0;
    const fallbackFlowScoreSum = daySessions.reduce(
      (sum: number, s) => sum + s.derivedFlowIndex,
      0,
    );
    const fallbackFlowScoreCount = daySessions.length;
    return {
      date,
      sessionCount: storedDailyStats?.focusSessionCount ?? fallbackSessionCount,
      minutes: storedDailyStats?.focusMinutes ?? fallbackFocusMinutes,
      resumeCount: daySessions.reduce((sum: number, s) => sum + (s.resumeCount ?? 0), 0),
      hasCompanion: storedDailyStats?.companionDay ?? fallbackCompanion,
      isQualified: storedDailyStats?.qualifiedDay ?? fallbackQualified,
      flowScoreSum: storedDailyStats?.flowScoreSum ?? fallbackFlowScoreSum,
      flowScoreCount: storedDailyStats?.flowScoreCount ?? fallbackFlowScoreCount,
    };
  });

  const totalMinutes = daily.reduce((sum, d) => sum + d.minutes, 0);
  const daysPresent = daily.filter((d) => d.minutes > 0).length;
  const companionDays = daily.filter((d) => d.hasCompanion).length;
  const qualifiedDays = daily.filter((d) => d.isQualified).length;
  const totalFlowScoreSum = daily.reduce((sum: number, day) => sum + day.flowScoreSum, 0);
  const totalFlowScoreCount = daily.reduce((sum: number, day) => sum + day.flowScoreCount, 0);
  const flowScore =
    totalFlowScoreCount > 0
      ? Math.round(totalFlowScoreSum / totalFlowScoreCount)
      : 0;
  const totalResumeCount = sessionsWithDerivedFlow.reduce(
    (sum: number, s) => sum + (s.resumeCount ?? 0),
    0,
  );
  const distractionCount = sessions.reduce(
    (sum: number, s) =>
      sum + ((s.hadDistraction || s.hadTabHide || s.hadIdle || s.hadRapidSwitch) ? 1 : 0),
    0,
  );
  const completedGoalIds = new Set(
    sessions
      .filter((s) => s.isMinMet && !!s.targetMilestoneId)
      .map((s) => s.targetMilestoneId as string),
  );
  const completedGoalsCount = completedGoalIds.size;

  const previousReport = await db.weeklyReport.findFirst({
    where: { userId, weekStart: { lt: weekStart } },
    orderBy: { weekStart: "desc" },
    select: {
      totalMinutes: true,
      flowAvg: true,
      streakDays: true,
      payloadJson: true,
    },
  });
  const historyReports = await db.weeklyReport.findMany({
    where: { userId, weekStart: { lt: weekStart } },
    select: {
      totalMinutes: true,
      flowAvg: true,
    },
  });

  const previousCompanionDays = getPreviousCompanionDays(previousReport?.payloadJson);
  const previousQualifiedDays = getPreviousQualifiedDays(previousReport?.payloadJson, previousReport?.streakDays ?? null);

  const isCurrentWeekAllZero =
    totalMinutes === 0 && flowScore === 0 && companionDays === 0 && qualifiedDays === 0;
  const hasPreviousReport = !!previousReport;
  const shouldCompareWithPrevious = hasPreviousReport && !isCurrentWeekAllZero;

  const focusDeltaPercent = shouldCompareWithPrevious
    ? computePercentDelta(totalMinutes, previousReport?.totalMinutes ?? null)
    : null;
  const flowDeltaPercent = shouldCompareWithPrevious
    ? computePercentDelta(flowScore, previousReport?.flowAvg ?? null)
    : null;
  const daysPresentDelta = shouldCompareWithPrevious
    ? computeAbsoluteDelta(companionDays, previousCompanionDays)
    : null;
  const streakDelta = shouldCompareWithPrevious
    ? computeAbsoluteDelta(qualifiedDays, previousQualifiedDays)
    : null;

  const focusHistory = historyReports.map((r) => r.totalMinutes);
  const flowHistory = historyReports
    .map((r) => r.flowAvg)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const highestFocusMinutes = Math.max(totalMinutes, ...focusHistory, 0);
  const highestFlowScore =
    flowHistory.length > 0 || flowScore > 0 ? Math.max(flowScore, ...flowHistory, 0) : null;
  const averageFocusMinutes = Math.round(
    average([totalMinutes, ...focusHistory]),
  );
  const averageFlowScore =
    flowHistory.length > 0 || flowScore > 0
      ? Math.round(average([flowScore, ...flowHistory]))
      : null;
  const focusVsAverage = compareAverage(totalMinutes, averageFocusMinutes);
  const flowVsAverage =
    typeof averageFlowScore === "number" ? compareAverage(flowScore, averageFlowScore) : "none";

  const peakTime = getPeakTimeBucket(sessionsWithDerivedFlow);
  const rhythmTitle = deriveRhythmTitle({
    daysPresent,
    totalMinutes,
    peakTime,
    totalResumeCount,
    sessionCount: sessions.length,
  });
  const rhythmSubtitle = buildCoverSubtitle(daysPresent, totalMinutes);
  const narrativeDay = pickNarrativeDay(daily, peakTime);
  const snippets = buildSnippets({
    sessions: sessionsWithDerivedFlow,
    daily,
    daysPresent,
    totalMinutes,
    peakTime,
    totalResumeCount,
    distractionCount,
    flowScore,
    completedGoalsCount,
    totalHoursText: formatHoursMinutes(totalMinutes),
    topFocusRecord: highestFocusMinutes,
    topFlowRecord: highestFlowScore,
    focusVsAverage,
    flowVsAverage,
    focusRecordBroken: totalMinutes > Math.max(...focusHistory, 0),
    flowRecordBroken:
      typeof highestFlowScore === "number" &&
      flowScore > Math.max(...flowHistory, 0),
  });
  const closingNote = buildClosingNote(daysPresent, totalMinutes);

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
    cover: {
      rhythmTitle,
      subtitle: rhythmSubtitle,
    },
    presence: {
      daysPresent,
      companionDays,
      qualifiedDays,
      totalMinutes,
      totalHours: roundTo1(totalMinutes / 60),
      flowScore,
      peakTime,
      narrativeDayLabel: narrativeDay?.label ?? null,
      narrative:
        narrativeDay?.sentence ??
        "这一周你在自己的节奏里出现过几次，Echo 都记得。",
      indicators: {
        flow: {
          value: flowScore,
          deltaPercent: flowDeltaPercent,
          direction: getPercentDirection(flowDeltaPercent),
        },
        focusDuration: {
          valueMinutes: totalMinutes,
          deltaPercent: focusDeltaPercent,
          direction: getPercentDirection(focusDeltaPercent),
        },
        daysPresent: {
          value: companionDays,
          deltaDays: daysPresentDelta,
          direction: getDeltaDirection(daysPresentDelta),
        },
        streak: {
          value: qualifiedDays,
          deltaDays: streakDelta,
          direction: getDeltaDirection(streakDelta),
        },
      },
      benchmarks: {
        focusMinutes: {
          highest: highestFocusMinutes,
          average: averageFocusMinutes,
          isNewRecord: totalMinutes > Math.max(...focusHistory, 0),
          vsAverage: focusVsAverage,
        },
        flowScore: {
          highest: highestFlowScore,
          average: averageFlowScore,
          isNewRecord:
            typeof highestFlowScore === "number" &&
            flowScore > Math.max(...flowHistory, 0),
          vsAverage: flowVsAverage,
        },
      },
    },
    snippets,
    closingNote,
    generatedAt: new Date().toISOString(),
  };

  if (options?.persist !== false) {
    await persistWeekly(userId, payload, weekStart, weekEnd);
  }

  return payload;
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
        totalMinutes: payload.presence.totalMinutes,
        wowChange: payload.presence.indicators.focusDuration.deltaPercent,
        streakDays: payload.presence.indicators.streak.value,
        bestDay: null,
        bestDayNote: payload.presence.narrative,
        flowAvg: payload.presence.flowScore,
        flowDelta: payload.presence.indicators.flow.deltaPercent,
        expTotal: null,
        payloadJson: payload,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId,
        weekStart,
        weekEnd,
        totalMinutes: payload.presence.totalMinutes,
        wowChange: payload.presence.indicators.focusDuration.deltaPercent,
        streakDays: payload.presence.indicators.streak.value,
        bestDay: null,
        bestDayNote: payload.presence.narrative,
        flowAvg: payload.presence.flowScore,
        flowDelta: payload.presence.indicators.flow.deltaPercent,
        expTotal: null,
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

function formatLabel(start: Date, end: Date) {
  const fmt = (d: Date) =>
    `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

function getTimeBucketByHour(hour: number): TimeBucket {
  if (hour >= 5 && hour < 9) return "清晨";
  if (hour >= 9 && hour < 14) return "上午";
  if (hour >= 14 && hour < 20) return "下午";
  return "夜晚";
}

function getPeakTimeBucket(
  sessions: Array<{ startTime: Date; duration: number | null; timeBucket: string | null }>,
): TimeBucket {
  const bucketMinutes: Record<TimeBucket, number> = {
    清晨: 0,
    上午: 0,
    下午: 0,
    夜晚: 0,
  };
  sessions.forEach((s) => {
    const fallback = getTimeBucketByHour(s.startTime.getHours());
    const bucket = normalizeTimeBucket(s.timeBucket) ?? fallback;
    bucketMinutes[bucket] += s.duration ?? 0;
  });
  return (Object.entries(bucketMinutes).sort((a, b) => b[1] - a[1])[0]?.[0] as TimeBucket) || "夜晚";
}

function normalizeTimeBucket(value: string | null): TimeBucket | null {
  if (!value) return null;
  if (value === "清晨" || value === "上午" || value === "下午" || value === "夜晚") return value;
  return null;
}

function roundTo1(value: number) {
  return Math.round(value * 10) / 10;
}

function deriveRhythmTitle(input: {
  daysPresent: number;
  totalMinutes: number;
  peakTime: TimeBucket;
  totalResumeCount: number;
  sessionCount: number;
}) {
  const { daysPresent, totalMinutes, peakTime, totalResumeCount, sessionCount } = input;
  if (sessionCount <= 1) return "在场型节奏";
  if (peakTime === "清晨") return "晨光型节奏";
  if (peakTime === "夜晚") return "夜航型节奏";
  if (totalResumeCount >= 3 && totalMinutes > 0) return "回流型节奏";
  if (daysPresent >= 4) return "稳步型节奏";
  return "在场型节奏";
}

function buildCoverSubtitle(daysPresent: number, totalMinutes: number) {
  if (daysPresent <= 0) return "这一周很安静，也没关系。";
  if (totalMinutes >= 240) return "你在属于自己的时段，留下了几段扎实的投入。";
  if (totalMinutes >= 120) return "你在这一周里多次回来，节奏很真实。";
  return "你出现过，哪怕片刻，也很珍贵。";
}

function pickNarrativeDay(
  daily: Array<{ date: string; sessionCount: number; minutes: number }>,
  peakTime: TimeBucket,
) {
  const candidate = [...daily].sort((a, b) => b.minutes - a.minutes)[0];
  if (!candidate || candidate.minutes <= 0) return null;
  return {
    label: formatDateLabel(candidate.date),
    sentence: `${formatDateLabel(candidate.date)}你在${peakTime}出现了${candidate.sessionCount}次，留下了约${formatMinutes(candidate.minutes)}的专注片段。`,
  };
}

function buildSnippets(input: {
  sessions: Array<{
    startTime: Date;
    duration: number | null;
    hadDistraction: boolean | null;
    hadTabHide: boolean | null;
    hadIdle: boolean | null;
    hadRapidSwitch: boolean | null;
    resumeCount: number | null;
  }>;
  daily: Array<{ date: string; sessionCount: number; minutes: number; resumeCount: number }>;
  daysPresent: number;
  totalMinutes: number;
  totalHoursText: string;
  flowScore: number;
  completedGoalsCount: number;
  peakTime: TimeBucket;
  totalResumeCount: number;
  distractionCount: number;
  topFocusRecord: number;
  topFlowRecord: number | null;
  focusVsAverage: AverageComparison;
  flowVsAverage: AverageComparison;
  focusRecordBroken: boolean;
  flowRecordBroken: boolean;
}): WeeklySnippet[] {
  const {
    sessions,
    daily,
    daysPresent,
    totalMinutes,
    totalHoursText,
    flowScore,
    completedGoalsCount,
    peakTime,
    totalResumeCount,
    distractionCount,
    topFocusRecord,
    topFlowRecord,
    focusVsAverage,
    flowVsAverage,
    focusRecordBroken,
    flowRecordBroken,
  } = input;
  const snippets: WeeklySnippet[] = [];

  if (completedGoalsCount > 0) {
    snippets.push({
      id: "goals",
      content: `这周你点亮了 ${completedGoalsCount} 个小目标。`,
    });
  }

  if (totalMinutes > 0) {
    snippets.push({
      id: "focus-total",
      content: `这周你累计专注 ${totalHoursText}，每一次回到当下都很珍贵。`,
    });
  }

  if (flowScore > 0) {
    snippets.push({
      id: "flow-score",
      content: `本周心流指数是 ${flowScore}，你的节奏正在被慢慢看见。`,
    });
  }

  if (daysPresent > 0) {
    snippets.push({
      id: "presence-days",
      content: `这一周你在 ${daysPresent} 天里出现过，Echo 都记得。`,
    });
  }

  if (totalResumeCount > 0) {
    snippets.push({
      id: "resume",
      content: `有 ${totalResumeCount} 次，你在停顿后又回到了当下。`,
    });
  }

  const longest = sessions.reduce((max, s) => Math.max(max, s.duration ?? 0), 0);
  if (longest >= 25) {
    snippets.push({
      id: "longest",
      content: `这周你留下一段约 ${formatMinutes(longest)} 的完整专注。`,
    });
  }

  if (distractionCount > 0) {
    snippets.push({
      id: "distraction",
      content: `外界有几次打断，但你仍然把注意力带回了自己。`,
    });
  }

  const topDay = [...daily].sort((a, b) => b.minutes - a.minutes)[0];
  if (topDay && topDay.minutes > 0) {
    snippets.push({
      id: "top-day",
      dateLabel: formatDateLabel(topDay.date),
      content: `${formatDateLabel(topDay.date)}是你这周最投入的一天。`,
    });
  }

  if (daysPresent > 0) {
    snippets.push({
      id: "peak-time",
      content: `你最常在${peakTime}回来，这段时间像你的专注主场。`,
    });
  }

  if (focusRecordBroken) {
    snippets.push({
      id: "focus-record",
      content: `你刷新了自己的周专注纪录（${formatHoursMinutes(topFocusRecord)}）。`,
    });
  }

  if (flowRecordBroken && typeof topFlowRecord === "number") {
    snippets.push({
      id: "flow-record",
      content: `你刷新了自己的周心流纪录（${topFlowRecord} 分）。`,
    });
  }

  if (focusVsAverage === "above" || flowVsAverage === "above") {
    snippets.push({
      id: "above-average",
      content: "这周整体表现高于你的周均水平。",
    });
  } else if (focusVsAverage === "equal" || flowVsAverage === "equal") {
    snippets.push({
      id: "equal-average",
      content: "和你的平均节奏持平，继续保持就很好。",
    });
  }

  if (snippets.length === 0) {
    snippets.push({
      id: "fallback",
      content: "这周你偶尔来过，Echo 会继续在这里等你。",
    });
  }

  return dedupeSnippets(snippets).slice(0, 5);
}

function buildClosingNote(daysPresent: number, totalMinutes: number) {
  if (daysPresent <= 0) {
    return "谢谢你来翻开这一页。下周我们再慢慢来。";
  }
  if (totalMinutes >= 180) {
    return "谢谢你把这一周交给 Echo。你已经在自己的节奏里前进。";
  }
  return "这一周已经走完了，Echo 会继续陪你走下一段。";
}

function formatMinutes(minutes: number) {
  if (minutes >= 60) {
    return `${roundTo1(minutes / 60)} 小时`;
  }
  return `${minutes} 分钟`;
}

function formatHoursMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${String(minutes).padStart(2, "0")}m`;
}

function formatDateLabel(date: string) {
  const d = new Date(date);
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
}

function pad(num: number) {
  return num.toString().padStart(2, "0");
}

function computePercentDelta(current: number, previous: number | null) {
  if (previous === null || previous < 0) return null;
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function computeAbsoluteDelta(current: number, previous: number | null) {
  if (previous === null || previous < 0) return null;
  return current - previous;
}

function getPercentDirection(deltaPercent: number | null): TrendDirection {
  if (deltaPercent === null) return "none";
  if (deltaPercent > 0) return "up";
  if (deltaPercent < 0) return "down";
  return "flat";
}

function getDeltaDirection(delta: number | null): TrendDirection {
  if (delta === null) return "none";
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function compareAverage(current: number, baseline: number): AverageComparison {
  if (baseline <= 0 && current <= 0) return "none";
  if (current > baseline) return "above";
  if (current < baseline) return "below";
  return "equal";
}

function getPreviousCompanionDays(payloadJson: unknown): number | null {
  if (!payloadJson || typeof payloadJson !== "object") return null;
  const root = payloadJson as Record<string, unknown>;
  const presence = root.presence as Record<string, unknown> | undefined;
  const value = presence?.companionDays;
  return typeof value === "number" ? value : null;
}

function getPreviousQualifiedDays(payloadJson: unknown, fallback: number | null): number | null {
  if (!payloadJson || typeof payloadJson !== "object") return fallback;
  const root = payloadJson as Record<string, unknown>;
  const presence = root.presence as Record<string, unknown> | undefined;
  const topLevelValue = presence?.qualifiedDays;
  if (typeof topLevelValue === "number") return topLevelValue;
  const indicators = presence?.indicators as Record<string, unknown> | undefined;
  const streak = indicators?.streak as Record<string, unknown> | undefined;
  const value = streak?.value;
  if (typeof value === "number" && value >= 0 && value <= 7) return value;
  return typeof fallback === "number" && fallback >= 0 && fallback <= 7 ? fallback : null;
}

function dedupeSnippets(snippets: WeeklySnippet[]) {
  const seen = new Set<string>();
  return snippets.filter((snippet) => {
    if (seen.has(snippet.id)) return false;
    seen.add(snippet.id);
    return true;
  });
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

