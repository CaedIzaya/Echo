/**
 * 统计数据计算工具
 * 
 * 目的：从数据库的 FocusSession 记录计算各种统计数据
 * 替代：localStorage 中的 todayStats 和 weeklyStats
 */

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * 获取本周开始日期（周一）
 */
export function getWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 调整为周一
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

/**
 * 获取今天的开始和结束时间
 */
export function getTodayRange(): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * 获取本周的开始和结束时间
 */
export function getWeekRange(): { start: Date; end: Date } {
  const weekStartStr = getWeekStart();
  const start = new Date(weekStartStr + 'T00:00:00');
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * 今日统计数据结构
 */
export interface TodayStats {
  minutes: number;
  sessions: number;
  date: string;
}

/**
 * 本周统计数据结构
 */
export interface WeeklyStats {
  totalMinutes: number;
  sessions: number;
  weekStart: string;
}

/**
 * 累计统计数据结构
 */
export interface TotalStats {
  totalMinutes: number;
  totalSessions: number;
  firstSessionDate: string | null;
  lastSessionDate: string | null;
}

/**
 * 从 FocusSession 数组计算今日统计
 */
export function calculateTodayStats(sessions: Array<{ duration: number; startTime: Date }>): TodayStats {
  const today = getTodayDate();
  const todaySessions = sessions.filter(s => 
    s.startTime.toISOString().split('T')[0] === today
  );

  return {
    minutes: todaySessions.reduce((sum, s) => sum + s.duration, 0),
    sessions: todaySessions.length,
    date: today,
  };
}

/**
 * 从 FocusSession 数组计算本周统计
 */
export function calculateWeeklyStats(sessions: Array<{ duration: number; startTime: Date }>): WeeklyStats {
  const weekRange = getWeekRange();
  const weekSessions = sessions.filter(s => 
    s.startTime >= weekRange.start && s.startTime <= weekRange.end
  );

  return {
    totalMinutes: weekSessions.reduce((sum, s) => sum + s.duration, 0),
    sessions: weekSessions.length,
    weekStart: getWeekStart(),
  };
}

/**
 * 从 FocusSession 数组计算累计统计
 */
export function calculateTotalStats(sessions: Array<{ duration: number; startTime: Date }>): TotalStats {
  if (sessions.length === 0) {
    return {
      totalMinutes: 0,
      totalSessions: 0,
      firstSessionDate: null,
      lastSessionDate: null,
    };
  }

  const sortedSessions = [...sessions].sort((a, b) => 
    a.startTime.getTime() - b.startTime.getTime()
  );

  return {
    totalMinutes: sessions.reduce((sum, s) => sum + s.duration, 0),
    totalSessions: sessions.length,
    firstSessionDate: sortedSessions[0].startTime.toISOString().split('T')[0],
    lastSessionDate: sortedSessions[sortedSessions.length - 1].startTime.toISOString().split('T')[0],
  };
}

/**
 * 计算昨日统计
 */
export function calculateYesterdayStats(sessions: Array<{ duration: number; startTime: Date }>): number {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const yesterdaySessions = sessions.filter(s => 
    s.startTime.toISOString().split('T')[0] === yesterdayStr
  );

  return yesterdaySessions.reduce((sum, s) => sum + s.duration, 0);
}

/**
 * 计算连续专注天数
 */
export function calculateStreakDays(sessions: Array<{ duration: number; startTime: Date }>): number {
  if (sessions.length === 0) return 0;

  // 按日期分组
  const dateMap = new Map<string, number>();
  sessions.forEach(s => {
    const date = s.startTime.toISOString().split('T')[0];
    dateMap.set(date, (dateMap.get(date) || 0) + s.duration);
  });

  // 按日期排序
  const dates = Array.from(dateMap.keys()).sort().reverse();
  
  // 从今天开始往回数连续天数
  const today = getTodayDate();
  let streakDays = 0;
  let checkDate = new Date(today);

  for (const date of dates) {
    const checkDateStr = checkDate.toISOString().split('T')[0];
    
    if (date === checkDateStr && (dateMap.get(date) || 0) >= 15) { // 至少15分钟才算
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1); // 检查前一天
    } else {
      break; // 中断连续
    }
  }

  return streakDays;
}











