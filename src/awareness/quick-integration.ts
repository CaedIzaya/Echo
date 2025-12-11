/**
 * 深度觉察引擎 - 快速集成模板
 * 复制这些代码到你的实际文件中
 */

import { buildAwarenessContext, getDialogueWithPriority, PriorityLevel } from './index';

/**
 * 快速集成模板 1：在文案获取函数中使用
 * 
 * 复制到你的 Lumi 或心树文案获取函数中
 */
export async function getDialogueWithAwarenessCheck(userId: string) {
  // TODO: 替换为你的实际数据获取函数
  const getUserData = async () => {
    // 从数据库获取用户数据
    // const user = await db.user.findUnique({ where: { id: userId } });
    // return user;
    return {} as any;
  };

  const getTodayStats = async () => {
    // 从数据库获取今日统计
    // const stats = await db.dayStats.findToday(userId);
    // return stats;
    return {} as any;
  };

  const getLastNDaysStats = async (days: number) => {
    // 从数据库获取最近 N 天统计
    // const stats = await db.dayStats.findLastNDays(userId, days);
    // return stats;
    return [] as any[];
  };

  const getRecentEvents = async (minutes: number) => {
    // 从数据库获取最近事件
    // const events = await db.events.findRecent(userId, minutes);
    // return events;
    return [] as any[];
  };

  // 1. 构建觉察上下文
  const ctx = await buildAwarenessContext(
    userId,
    getUserData,
    getTodayStats,
    getLastNDaysStats,
    getRecentEvents
  );

  // 2. 优先检查觉察引擎
  const awarenessDialogue = getDialogueWithPriority(ctx);
  
  if (awarenessDialogue && awarenessDialogue.priority === PriorityLevel.AWARENESS) {
    // 觉察引擎匹配，返回觉察文案，阻止其他系统
    return {
      copy: awarenessDialogue.copy,
      source: awarenessDialogue.source,
      isAwareness: true,
      metadata: awarenessDialogue.metadata,
    };
  }

  // 3. 觉察引擎未匹配，返回 null，由其他系统处理
  return null;
}

/**
 * 快速集成模板 2：在事件处理函数中使用
 * 
 * 复制到你的事件处理函数中
 */
export async function handleEventWithAwareness(
  userId: string,
  eventType: 'APP_LAUNCH' | 'FOCUS_TIMER_END' | 'LUMI_CLICK' | 'APP_FOREGROUND_START' | 'HEART_TREE_OPEN'
) {
  // TODO: 替换为你的实际数据获取函数
  const ctx = await buildAwarenessContext(
    userId,
    getUserData,
    getTodayStats,
    getLastNDaysStats,
    getRecentEvents
  );

  // 触发觉察检测
  const awarenessDialogue = getDialogueWithPriority(ctx);
  
  if (awarenessDialogue) {
    // 觉察引擎匹配，可以在这里显示 UI
    console.log('觉察引擎触发:', awarenessDialogue);
    // showDialogueUI(awarenessDialogue);
    return true; // 返回 true 表示已处理，阻止其他系统
  }

  return false; // 返回 false 表示未匹配，继续其他流程
}

// 占位函数，需要替换为实际实现
async function getUserData() { return {} as any; }
async function getTodayStats() { return {} as any; }
async function getLastNDaysStats(days: number) { return [] as any[]; }
async function getRecentEvents(minutes: number) { return [] as any[]; }


