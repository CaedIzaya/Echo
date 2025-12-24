/**
 * 深度觉察引擎 - 数据库适配器
 * 适配不同的数据库结构，将数据库数据转换为觉察引擎所需的数据格式
 */

import { UserState, DayStats, Event, AwarenessContext } from './types';
import { formatDate, getLocalHour } from './utils';

/**
 * 数据库用户模型（示例，需要根据实际数据库结构调整）
 */
export interface DatabaseUser {
  id: string;
  currentStreak?: number;
  streakStableDays?: number;
  lastActiveDate?: Date | string;
  timezone?: string;
  hasNamedHeartTree?: boolean;
  heartTreeName?: string;
}

/**
 * 数据库日统计模型（示例，需要根据实际数据库结构调整）
 */
export interface DatabaseDayStats {
  date: Date | string;
  appForegroundMinutes?: number;
  homeStayMinutes?: number;
  focusTotalMinutes?: number;
  focusGoalMinutes?: number;
  focusSessionCount?: number;
  focusShortSessionCount?: number;
  focusTimerOpenCountNoStart?: number;
  lumiClickCount?: number;
}

/**
 * 数据库事件模型（示例，需要根据实际数据库结构调整）
 */
export interface DatabaseEvent {
  userId: string;
  type: string;
  timestamp: Date | number;
  metadata?: Record<string, any>;
}

/**
 * 将数据库用户数据转换为 UserState
 */
export function adaptUserState(
  dbUser: DatabaseUser,
  userId: string
): UserState {
  // 处理日期格式
  let lastActiveDate: string;
  if (dbUser.lastActiveDate) {
    if (typeof dbUser.lastActiveDate === 'string') {
      lastActiveDate = dbUser.lastActiveDate;
    } else {
      lastActiveDate = formatDate(dbUser.lastActiveDate);
    }
  } else {
    // 如果没有上次活跃日期，使用今天
    lastActiveDate = formatDate(new Date());
  }

  return {
    userId: userId || dbUser.id,
    currentStreak: dbUser.currentStreak ?? 1,
    streakStableDays: dbUser.streakStableDays ?? 0,
    lastActiveDate,
    timezone: dbUser.timezone ?? 'Asia/Shanghai',
    hasNamedHeartTree: dbUser.hasNamedHeartTree ?? false,
    heartTreeName: dbUser.heartTreeName,
  };
}

/**
 * 将数据库日统计数据转换为 DayStats
 */
export function adaptDayStats(
  dbStats: DatabaseDayStats,
  date?: string
): DayStats {
  // 处理日期格式
  let statsDate: string;
  if (date) {
    statsDate = date;
  } else if (typeof dbStats.date === 'string') {
    statsDate = dbStats.date;
  } else {
    statsDate = formatDate(dbStats.date);
  }

  return {
    date: statsDate,
    appForegroundMinutes: dbStats.appForegroundMinutes ?? 0,
    homeStayMinutes: dbStats.homeStayMinutes ?? 0,
    focusTotalMinutes: dbStats.focusTotalMinutes ?? 0,
    focusGoalMinutes: dbStats.focusGoalMinutes,
    focusSessionCount: dbStats.focusSessionCount ?? 0,
    focusShortSessionCount: dbStats.focusShortSessionCount ?? 0,
    focusTimerOpenCountNoStart: dbStats.focusTimerOpenCountNoStart ?? 0,
    lumiClickCount: dbStats.lumiClickCount ?? 0,
  };
}

/**
 * 将数据库事件数据转换为 Event
 */
export function adaptEvent(dbEvent: DatabaseEvent): Event {
  // 处理时间戳
  let timestamp: number;
  if (typeof dbEvent.timestamp === 'number') {
    timestamp = dbEvent.timestamp;
  } else {
    timestamp = dbEvent.timestamp.getTime();
  }

  return {
    userId: dbEvent.userId,
    type: dbEvent.type as Event['type'],
    ts: timestamp,
    meta: dbEvent.metadata,
  };
}

/**
 * 构建完整的 AwarenessContext
 * 从数据库获取数据并转换为觉察引擎所需的格式
 */
export async function buildAwarenessContext(
  userId: string,
  getUserData: () => Promise<DatabaseUser> | DatabaseUser,
  getTodayStats: () => Promise<DatabaseDayStats> | DatabaseDayStats,
  getLastNDaysStats: (days: number) => Promise<DatabaseDayStats[]> | DatabaseDayStats[],
  getRecentEvents: (minutes: number) => Promise<DatabaseEvent[]> | DatabaseEvent[]
): Promise<AwarenessContext> {
  // 获取用户数据
  const dbUser = await Promise.resolve(getUserData());
  const userState = adaptUserState(dbUser, userId);

  // 获取今日统计
  const dbTodayStats = await Promise.resolve(getTodayStats());
  const today = adaptDayStats(dbTodayStats);

  // 获取最近 N 天统计
  const dbLastNDays = await Promise.resolve(getLastNDaysStats(5));
  const lastNDays = dbLastNDays.map(stats => adaptDayStats(stats));

  // 获取最近事件
  const dbRecentEvents = await Promise.resolve(getRecentEvents(60));
  const recentEvents = dbRecentEvents.map(adaptEvent);

  // 构建上下文
  const now = new Date();
  return {
    userState,
    today,
    lastNDays,
    nowTs: now.getTime(),
    nowLocalHour: getLocalHour(now, userState.timezone),
    recentEvents,
  };
}

/**
 * Prisma 适配器示例（如果使用 Prisma）
 */
export function adaptPrismaUser(prismaUser: any): UserState {
  return adaptUserState({
    id: prismaUser.id,
    currentStreak: prismaUser.currentStreak,
    streakStableDays: prismaUser.streakStableDays,
    lastActiveDate: prismaUser.lastActiveDate,
    timezone: prismaUser.timezone,
    hasNamedHeartTree: prismaUser.hasNamedHeartTree,
    heartTreeName: prismaUser.heartTreeName,
  }, prismaUser.id);
}




















