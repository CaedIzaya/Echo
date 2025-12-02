// ---------- 类型定义 ----------

export interface FlowMetrics {
  // 专注时长相关
  totalFocusMinutes: number;
  averageSessionLength: number;
  longestSession: number;

  // 专注频率相关
  sessionCount: number;
  consistencyScore: number;

  // 专注质量相关
  averageRating: number;
  completionRate: number;
  interruptionRate: number;

  // 持续成长相关
  currentStreak: number;
  improvementTrend: number;

  // 稳定印象 & 临时心流
  impressionScore: number;
  tempFlowScore: number;
  lastSessionAt?: string | null;
  lastDecayAt?: string | null;
  recentQualityStreak: number;
  lastBehaviorPenaltyAt?: string | null;
}

export interface FlowIndexResult {
  score: number;
  level: string;
  breakdown: {
    quality: number;
    duration: number;
    consistency: number;
  };
}

export interface FlowUpdateContext {
  completedSession?: boolean;
  interrupted?: boolean;
  dailyGoalMinutes?: number;
  completedDailyGoal?: boolean;
  streakDays?: number;
}

export interface DailyBehaviorRecord {
  date: string;
  present: boolean;
  focused: boolean;
  metGoal: boolean;
  overGoal: boolean;
}

export interface WeeklyBehaviorSnapshot {
  rawScore: number;
  normalizedScore: number; // 0~1
  scaledScore: number; // 0~70
}

// ---------- 常量 & 工具函数 ----------

export const MIN_IMPRESSION = 35;
export const MAX_IMPRESSION = 97;
export const MAX_TEMP_FLOW = 45;
export const MIN_TEMP_FLOW = -20;
const HOURS_IN_DAY = 24;
const MS_IN_HOUR = 1000 * 60 * 60;
const MS_IN_DAY = MS_IN_HOUR * HOURS_IN_DAY;
const BEHAVIOR_STORAGE_KEY = 'weeklyBehaviorRecords';
const BEHAVIOR_POINTS = {
  present: 1,
  focused: 3,
  metGoal: 8,
  overGoal: 10
};
const MAX_DAILY_BEHAVIOR_SCORE =
  BEHAVIOR_POINTS.present +
  BEHAVIOR_POINTS.focused +
  BEHAVIOR_POINTS.metGoal +
  BEHAVIOR_POINTS.overGoal;
const MAX_WEEKLY_BEHAVIOR_SCORE = MAX_DAILY_BEHAVIOR_SCORE * 7;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const normalize = (value: number, min: number, max: number) =>
  clamp((value - min) / (max - min), 0, 1);

// 边际收益递减，前期涨得快，后期趋缓
const easeSqrt = (x: number) => Math.sqrt(clamp(x, 0, 1));

// ---------- 默认值 & shape 保障 ----------

export const FLOW_DEFAULTS: FlowMetrics = {
  totalFocusMinutes: 0,
  averageSessionLength: 0,
  longestSession: 0,
  sessionCount: 0,
  consistencyScore: 0.5,
  averageRating: 2.0,
  completionRate: 0.7,
  interruptionRate: 0.2,
  currentStreak: 0,
  improvementTrend: 0,
  impressionScore: 40,
  tempFlowScore: 0,
  lastSessionAt: null,
  lastDecayAt: null,
  recentQualityStreak: 0,
  lastBehaviorPenaltyAt: null
};

export const ensureFlowMetricsShape = (raw?: Partial<FlowMetrics>): FlowMetrics => {
  if (!raw) return { ...FLOW_DEFAULTS };
  return {
    ...FLOW_DEFAULTS,
    ...raw,
    impressionScore: raw.impressionScore ?? FLOW_DEFAULTS.impressionScore,
    tempFlowScore: raw.tempFlowScore ?? FLOW_DEFAULTS.tempFlowScore,
    lastSessionAt: raw.lastSessionAt ?? FLOW_DEFAULTS.lastSessionAt,
    lastDecayAt: raw.lastDecayAt ?? raw.lastSessionAt ?? FLOW_DEFAULTS.lastDecayAt,
    recentQualityStreak: raw.recentQualityStreak ?? FLOW_DEFAULTS.recentQualityStreak,
    lastBehaviorPenaltyAt: raw.lastBehaviorPenaltyAt ?? FLOW_DEFAULTS.lastBehaviorPenaltyAt
  };
};

// ---------- 临时心流衰减 & 印象冷却 ----------

export const applyTempFlowDecay = (metrics: FlowMetrics, referenceTime: number): boolean => {
  const last = metrics.lastDecayAt || metrics.lastSessionAt;
  if (!last) {
    metrics.lastDecayAt = new Date(referenceTime).toISOString();
    return true;
  }
  const hoursPassed = (referenceTime - Date.parse(last)) / MS_IN_HOUR;
  if (hoursPassed < 1) {
    return false;
  }

  const slowHours = Math.min(hoursPassed, 12);
  const mediumHours = Math.min(Math.max(hoursPassed - 12, 0), 36);
  const fastHours = Math.max(hoursPassed - 48, 0);
  const decayAmount =
    slowHours * 0.35 + // 0~4.2
    mediumHours * 0.65 + // 0~23.4
    fastHours * 1.1; // 0+

  let updatedTemp = metrics.tempFlowScore;
  if (updatedTemp > 0) {
    updatedTemp = clamp(updatedTemp - decayAmount, MIN_TEMP_FLOW, MAX_TEMP_FLOW);
  } else if (updatedTemp < 0) {
    updatedTemp = Math.min(0, updatedTemp + decayAmount * 0.5);
  }

  const changed = updatedTemp !== metrics.tempFlowScore;
  metrics.tempFlowScore = Number(updatedTemp.toFixed(2));
  metrics.lastDecayAt = new Date(referenceTime).toISOString();

  return changed;
};

export const applyImpressionCooling = (metrics: FlowMetrics, referenceTime: number): boolean => {
  if (!metrics.lastSessionAt) return false;

  const daysInactive = (referenceTime - Date.parse(metrics.lastSessionAt)) / MS_IN_DAY;
  if (daysInactive <= 7) return false;

  const decay = Math.min((daysInactive - 7) * 0.35, 8);
  const cooled = clamp(metrics.impressionScore - decay, MIN_IMPRESSION, MAX_IMPRESSION);
  if (cooled === metrics.impressionScore) return false;

  metrics.impressionScore = Number(cooled.toFixed(2));
  return true;
};

// ---------- Session 质量计算（可独立复用） ----------

export const calculateSessionQuality = ({
  sessionMinutes,
  rating,
  dailyGoalMinutes,
  completedDailyGoal
}: {
  sessionMinutes: number;
  rating: number;
  dailyGoalMinutes?: number;
  completedDailyGoal?: boolean;
}) => {
  const normalizedRating = clamp(rating / 3, 0, 1);
  const goalReference =
    dailyGoalMinutes && dailyGoalMinutes > 0 ? dailyGoalMinutes : Math.max(sessionMinutes, 20);
  const durationFactor = clamp(sessionMinutes / goalReference, 0, 1);
  const completionFactor = completedDailyGoal
    ? 1
    : clamp(sessionMinutes / Math.max(goalReference * 0.6, 1), 0, 1);

  return normalizedRating * 0.45 + durationFactor * 0.35 + completionFactor * 0.2;
};

// ---------- 行为记录（localStorage 版） ----------

const defaultBehaviorRecord = (date: string): DailyBehaviorRecord => ({
  date,
  present: false,
  focused: false,
  metGoal: false,
  overGoal: false
});

const pruneBehaviorRecords = (records: Record<string, DailyBehaviorRecord>) => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 6); // 保留最近 7 天
  const thresholdKey = threshold.toISOString().split('T')[0];
  let mutated = false;
  const result: Record<string, DailyBehaviorRecord> = {};

  Object.entries(records || {}).forEach(([key, record]) => {
    if (key >= thresholdKey) {
      result[key] = {
        ...defaultBehaviorRecord(key),
        ...record,
        date: key
      };
    } else {
      mutated = true;
    }
  });

  return { records: result, mutated };
};

export const loadBehaviorRecords = (): Record<string, DailyBehaviorRecord> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(BEHAVIOR_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const { records, mutated } = pruneBehaviorRecords(parsed);
    if (mutated) {
      window.localStorage.setItem(BEHAVIOR_STORAGE_KEY, JSON.stringify(records));
    }
    return records;
  } catch (error) {
    console.error('读取 weeklyBehaviorRecords 失败:', error);
    return {};
  }
};

export const saveBehaviorRecords = (records: Record<string, DailyBehaviorRecord>) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BEHAVIOR_STORAGE_KEY, JSON.stringify(records));
};

export const updateDailyBehaviorRecord = (
  date: string,
  updates: Partial<DailyBehaviorRecord>
) => {
  if (typeof window === 'undefined') return;
  const records = loadBehaviorRecords();
  const updatedRecord = {
    ...defaultBehaviorRecord(date),
    ...(records[date] || {}),
    ...updates,
    date
  };
  records[date] = updatedRecord;
  saveBehaviorRecords(records);
};

export const calculateWeeklyBehaviorScore = (): WeeklyBehaviorSnapshot => {
  if (typeof window === 'undefined') {
    return {
      rawScore: 0,
      normalizedScore: 0,
      scaledScore: 0
    };
  }

  const records = loadBehaviorRecords();
  let rawScore = 0;

  Object.values(records).forEach(record => {
    rawScore += record.present ? BEHAVIOR_POINTS.present : 0;
    rawScore += record.focused ? BEHAVIOR_POINTS.focused : 0;
    rawScore += record.metGoal ? BEHAVIOR_POINTS.metGoal : 0;
    rawScore += record.overGoal ? BEHAVIOR_POINTS.overGoal : 0;
  });

  const normalizedScore = clamp(rawScore / MAX_WEEKLY_BEHAVIOR_SCORE, 0, 1);
  const scaledScore = Math.round(normalizedScore * 70);

  return {
    rawScore,
    normalizedScore,
    scaledScore
  };
};

// ---------- Flow Index 计算 ----------

const getLevel = (score: number): string => {
  if (score < 40) return '萌芽';
  if (score < 60) return '起势';
  if (score < 80) return '高流';
  return '巅峰';
};

export const computeFlowIndex = (
  metrics: FlowMetrics,
  weeklyBehavior: WeeklyBehaviorSnapshot
): FlowIndexResult => {
  const m = metrics;
  const weeklyNorm = clamp(weeklyBehavior.normalizedScore, 0, 1);

  // ===== 1. 质量 quality =====
  const qualityRating = normalize(m.averageRating, 1, 3); // 1~3 → 0~1
  const qualityCompletion = clamp(m.completionRate, 0, 1);
  const qualityNoInterrupt = 1 - clamp(m.interruptionRate, 0, 1);
  const tempFlowNorm = normalize(m.tempFlowScore, MIN_TEMP_FLOW, MAX_TEMP_FLOW);
  const qualityStreakNorm = normalize(m.recentQualityStreak, 0, 10); // 10 视为高 streak

  const baseQuality01 =
    qualityRating * 0.45 +
    qualityCompletion * 0.25 +
    qualityNoInterrupt * 0.15 +
    qualityStreakNorm * 0.15;

  // 临时心流只做小幅度乘法加成
  const tempFlowMultiplier = 0.85 + 0.3 * tempFlowNorm; // 0.85~1.15
  const qualityScore = clamp(baseQuality01 * tempFlowMultiplier * 100, 0, 100);

  // ===== 2. 时长 duration =====
  const totalMinutesNorm = easeSqrt(normalize(m.totalFocusMinutes, 0, 6000)); // 0~100 小时
  const avgSessionNorm = easeSqrt(normalize(m.averageSessionLength, 10, 90)); // 10~90 分钟
  const longestSessionNorm = easeSqrt(normalize(m.longestSession, 20, 120)); // 20~120 分钟

  const baseDuration01 =
    totalMinutesNorm * 0.5 + avgSessionNorm * 0.3 + longestSessionNorm * 0.2;

  const durationScore = clamp(baseDuration01 * 100, 0, 100);

  // ===== 3. 稳定性 consistency =====
  const consistencyBaseNorm = clamp(m.consistencyScore, 0, 1);
  const streakNorm = easeSqrt(normalize(m.currentStreak, 0, 21)); // 21 天连击视为“满级”
  const sessionCountNorm = easeSqrt(normalize(m.sessionCount, 0, 50)); // 50 次后边际低
  const impressionNorm = normalize(m.impressionScore, MIN_IMPRESSION, MAX_IMPRESSION);

  const baseConsistency01 =
    consistencyBaseNorm * 0.3 +
    streakNorm * 0.25 +
    weeklyNorm * 0.2 +
    impressionNorm * 0.15 +
    sessionCountNorm * 0.1;

  const consistencyScore = clamp(baseConsistency01 * 100, 0, 100);

  // ===== 4. 综合 & 行为加成 =====
  // 质量 > 稳定 > 时长
  const baseComposite = qualityScore * 0.45 + durationScore * 0.25 + consistencyScore * 0.3;

  // impression 作为 anchor（历史印象地基）
  const impressionAnchor = 40 + 55 * impressionNorm; // 0~1 → 40~95
  const anchoredScore = baseComposite * 0.7 + impressionAnchor * 0.3;

  // 周行为加成：0~1 → 0.7~1.35
  const behaviorMultiplier = 0.7 + 0.65 * weeklyNorm;

  // 疲劳惩罚：表现过低时扣最多 8 分
  const behaviorFatiguePenalty = weeklyNorm >= 0.2 ? 0 : (0.2 - weeklyNorm) * 40;

  let score = anchoredScore * behaviorMultiplier - behaviorFatiguePenalty;
  score = clamp(score, 0, 100);

  const level = getLevel(score);

  return {
    score: Number(score.toFixed(1)),
    level,
    breakdown: {
      quality: Number(qualityScore.toFixed(1)),
      duration: Number(durationScore.toFixed(1)),
      consistency: Number(consistencyScore.toFixed(1))
    }
  };
};




