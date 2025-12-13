/**
 * 深度觉察引擎 - 集成指南
 * 说明如何将觉察引擎集成到现有系统中，确保优先级最高
 */

import { AwarenessContext, AwarenessResponse } from './types';
import { getDialogueWithPriority, shouldBlockOtherDialogues, getFinalDialogue, PriorityLevel } from './priority-manager';
import { buildAwarenessContext } from './database-adapter';

/**
 * 集成方案 1：在现有文案系统之前拦截
 * 
 * 在你的 Lumi 或心树文案获取函数中，先调用觉察引擎检查
 */
export function integratedDialogueGetter(
  userId: string,
  ctx: AwarenessContext,
  normalDialogueGetter: () => string | null
): string | null {
  // 1. 优先检查觉察引擎
  const awarenessDialogue = getDialogueWithPriority(ctx);
  
  if (awarenessDialogue && awarenessDialogue.priority >= PriorityLevel.AWARENESS_LOW) {
    // 觉察引擎匹配，返回觉察文案，阻止其他文案系统
    return awarenessDialogue.copy;
  }

  // 2. 觉察引擎未匹配，使用普通文案系统
  return normalDialogueGetter();
}

/**
 * 集成方案 2：使用统一入口
 * 
 * 创建一个统一的文案获取函数，内部处理优先级
 */
export function unifiedDialogueGetter(
  ctx: AwarenessContext,
  normalDialogueGetter: () => { copy: string; source: string } | null
): { copy: string; source: string; priority: number } | null {
  const result = getFinalDialogue(ctx, () => {
    const normal = normalDialogueGetter();
    if (!normal) return null;
    return {
      priority: PriorityLevel.NORMAL,
      source: normal.source as any,
      copy: normal.copy,
    };
  });

  return result;
}

/**
 * 集成方案 3：事件驱动的集成
 * 
 * 在关键事件发生时，先检查觉察引擎，再决定是否触发其他系统
 */
export async function onEventWithAwarenessCheck(
  userId: string,
  eventType: string,
  getUserData: () => Promise<any>,
  getTodayStats: () => Promise<any>,
  getLastNDaysStats: (days: number) => Promise<any[]>,
  getRecentEvents: (minutes: number) => Promise<any[]>,
  normalEventHandler: () => void
): Promise<void> {
  // 1. 构建觉察上下文
  const ctx = await buildAwarenessContext(
    userId,
    getUserData,
    getTodayStats,
    getLastNDaysStats,
    getRecentEvents
  );

  // 2. 检查是否应该阻止其他事件处理
  const shouldBlock = shouldBlockOtherDialogues(ctx);
  
  if (shouldBlock) {
    // 觉察引擎已处理，不触发其他系统
    console.log('[Awareness] Blocking normal dialogue system');
    return;
  }

  // 3. 觉察引擎未匹配，继续正常流程
  normalEventHandler();
}

/**
 * React Hook 示例（如果使用 React）
 */
export function useAwarenessDialogue(
  userId: string,
  ctx: AwarenessContext | null
): { copy: string | null; source: string | null; isAwareness: boolean } {
  if (!ctx) {
    return { copy: null, source: null, isAwareness: false };
  }

  const dialogue = getDialogueWithPriority(ctx);
  
  if (dialogue && dialogue.priority >= PriorityLevel.AWARENESS_LOW) {
    return {
      copy: dialogue.copy,
      source: dialogue.source,
      isAwareness: true,
    };
  }

  return { copy: null, source: null, isAwareness: false };
}

/**
 * 集成检查清单
 */
export const INTEGRATION_CHECKLIST = {
  // 1. 数据库适配
  database: [
    '确认用户表包含：currentStreak, streakStableDays, lastActiveDate, timezone, hasNamedHeartTree, heartTreeName',
    '确认日统计表包含：appForegroundMinutes, homeStayMinutes, focusTotalMinutes, focusGoalMinutes, focusSessionCount, focusShortSessionCount, focusTimerOpenCountNoStart, lumiClickCount',
    '确认事件表包含：userId, type, timestamp, metadata',
    '实现数据库适配函数（参考 database-adapter.ts）',
  ],

  // 2. 优先级集成
  priority: [
    '在所有文案获取函数之前调用 getDialogueWithPriority()',
    '如果返回非 null，使用觉察文案，跳过其他文案系统',
    '如果返回 null，继续使用普通文案系统',
  ],

  // 3. 事件集成
  events: [
    '在 APP_LAUNCH 时调用觉察检测',
    '在 FOCUS_TIMER_END 时调用觉察检测',
    '在 LUMI_CLICK 时调用觉察检测',
    '在 APP_FOREGROUND_START 时调用觉察检测',
    '在 HEART_TREE_OPEN 时调用觉察检测',
  ],

  // 4. UI 集成
  ui: [
    '实现 Lumi 气泡组件（用于 LAUNCH 和 PASSIVE 模式）',
    '实现心树浮窗组件（用于 HEART_TREE_FLOATING 模式）',
    '实现心树图标发亮效果（场景 3）',
    '实现心树命名流程（首次进入时）',
  ],
};




