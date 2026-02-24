import { db } from "~/server/db";
import type { WeeklyReport } from "@prisma/client";

const WEEKLY_REPORT_TTL_DAYS = 84; // 12 周
const ANCHORED_REPORT_DAYS = 7;

type TimeBucket = "清晨" | "上午" | "下午" | "夜晚";

type WeeklySnippet = {
  id: string;
  content: string;
  dateLabel?: string;
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
  cover: {
    rhythmTitle: string;
    subtitle: string;
  };
  presence: {
    daysPresent: number;
    totalMinutes: number;
    totalHours: number;
    peakTime: TimeBucket;
    narrativeDayLabel: string | null;
    narrative: string;
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

  const [user, sessions] =
    await Promise.all([
      db.user.findUnique({ where: { id: userId } }),
      db.focusSession.findMany({
        where: { userId, startTime: { gte: weekStart, lte: weekEnd } },
        select: {
          startTime: true,
          duration: true,
          hadDistraction: true,
          hadTabHide: true,
          hadIdle: true,
          hadRapidSwitch: true,
          resumeCount: true,
          timeBucket: true,
          startHourBucket: true,
          sessionLengthBucket: true,
        },
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

  const daily = weekDates.map((date) => {
    const daySessions = sessions.filter((s) => formatDateKey(s.startTime) === date);
    return {
      date,
      sessionCount: daySessions.length,
      minutes: daySessions.reduce((sum, s) => sum + (s.duration ?? 0), 0),
      resumeCount: daySessions.reduce((sum, s) => sum + (s.resumeCount ?? 0), 0),
    };
  });

  const totalMinutes = daily.reduce((sum, d) => sum + d.minutes, 0);
  const daysPresent = daily.filter((d) => d.minutes > 0).length;
  const totalResumeCount = sessions.reduce((sum, s) => sum + (s.resumeCount ?? 0), 0);
  const distractionCount = sessions.reduce(
    (sum, s) => sum + ((s.hadDistraction || s.hadTabHide || s.hadIdle || s.hadRapidSwitch) ? 1 : 0),
    0,
  );
  const peakTime = getPeakTimeBucket(sessions);
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
    sessions,
    daily,
    daysPresent,
    totalMinutes,
    peakTime,
    totalResumeCount,
    distractionCount,
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
      totalMinutes,
      totalHours: roundTo1(totalMinutes / 60),
      peakTime,
      narrativeDayLabel: narrativeDay?.label ?? null,
      narrative:
        narrativeDay?.sentence ??
        "这一周你在自己的节奏里出现过几次，Echo 都记得。",
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
        wowChange: null,
        streakDays: payload.presence.daysPresent,
        bestDay: null,
        bestDayNote: payload.presence.narrative,
        flowAvg: null,
        flowDelta: null,
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
        wowChange: null,
        streakDays: payload.presence.daysPresent,
        bestDay: null,
        bestDayNote: payload.presence.narrative,
        flowAvg: null,
        flowDelta: null,
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
  peakTime: TimeBucket;
  totalResumeCount: number;
  distractionCount: number;
}): WeeklySnippet[] {
  const { sessions, daily, daysPresent, totalMinutes, peakTime, totalResumeCount, distractionCount } = input;
  const snippets: WeeklySnippet[] = [];

  if (daysPresent > 0) {
    snippets.push({
      id: "presence",
      content: `这一周你在 ${daysPresent} 天里出现过，共留下了 ${formatMinutes(totalMinutes)}。`,
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
      content: `${formatDateLabel(topDay.date)}的${peakTime}，是这周较常出现的一段。`,
    });
  }

  if (snippets.length === 0) {
    snippets.push({
      id: "fallback",
      content: "这周你偶尔来过，Echo 会继续在这里等你。",
    });
  }

  return snippets.slice(0, 3);
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

function formatDateLabel(date: string) {
  const d = new Date(date);
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
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

