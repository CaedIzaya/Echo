/**
 * 深度觉察引擎 - 集成示例
 * 展示如何在实际项目中集成和使用觉察引擎
 */

import {
  AwarenessContext,
  Event,
  DayStats,
  UserState,
  AwarenessResponse,
} from './types';
import { triggerAwareness, registerResponseHandler } from './dispatcher';
import { formatDate, getLocalHour } from './utils';

/**
 * 示例：在 App 启动时触发觉察检测
 */
export function onAppLaunch(
  userId: string,
  userState: UserState,
  todayStats: DayStats,
  lastNDaysStats: DayStats[],
  recentEvents: Event[]
): void {
  const ctx: AwarenessContext = {
    userState,
    today: todayStats,
    lastNDays: lastNDaysStats,
    nowTs: Date.now(),
    nowLocalHour: getLocalHour(new Date(), userState.timezone),
    recentEvents,
  };

  // 触发觉察检测（如果是 LAUNCH 模式，会自动触发）
  triggerAwareness(ctx);
}

/**
 * 示例：在专注计时器结束时触发觉察检测
 */
export function onFocusTimerEnd(
  userId: string,
  userState: UserState,
  todayStats: DayStats,
  lastNDaysStats: DayStats[],
  recentEvents: Event[],
  sessionDurationMinutes: number
): void {
  // 更新 todayStats（实际项目中应该从数据层获取最新数据）
  const updatedTodayStats: DayStats = {
    ...todayStats,
    focusSessionCount: todayStats.focusSessionCount + 1,
    focusTotalMinutes: todayStats.focusTotalMinutes + sessionDurationMinutes,
    focusShortSessionCount: sessionDurationMinutes < 3
      ? todayStats.focusShortSessionCount + 1
      : todayStats.focusShortSessionCount,
  };

  // 添加事件到 recentEvents
  const event: Event = {
    userId,
    type: 'FOCUS_TIMER_END',
    ts: Date.now(),
    meta: {
      durationMinutes: sessionDurationMinutes,
    },
  };

  const ctx: AwarenessContext = {
    userState,
    today: updatedTodayStats,
    lastNDays: lastNDaysStats,
    nowTs: Date.now(),
    nowLocalHour: getLocalHour(new Date(), userState.timezone),
    recentEvents: [...recentEvents, event],
  };

  triggerAwareness(ctx);
}

/**
 * 示例：在 Lumi 被点击时触发觉察检测
 */
export function onLumiClick(
  userId: string,
  userState: UserState,
  todayStats: DayStats,
  lastNDaysStats: DayStats[],
  recentEvents: Event[]
): void {
  // 更新 todayStats
  const updatedTodayStats: DayStats = {
    ...todayStats,
    lumiClickCount: todayStats.lumiClickCount + 1,
  };

  // 添加事件
  const event: Event = {
    userId,
    type: 'LUMI_CLICK',
    ts: Date.now(),
  };

  const ctx: AwarenessContext = {
    userState,
    today: updatedTodayStats,
    lastNDays: lastNDaysStats,
    nowTs: Date.now(),
    nowLocalHour: getLocalHour(new Date(), userState.timezone),
    recentEvents: [...recentEvents, event],
  };

  triggerAwareness(ctx);
}

/**
 * 示例：在 App 前台停留时间更新时触发觉察检测
 */
export function onAppForegroundUpdate(
  userId: string,
  userState: UserState,
  todayStats: DayStats,
  lastNDaysStats: DayStats[],
  recentEvents: Event[],
  foregroundMinutes: number,
  homeStayMinutes: number
): void {
  const updatedTodayStats: DayStats = {
    ...todayStats,
    appForegroundMinutes: foregroundMinutes,
    homeStayMinutes: homeStayMinutes,
  };

  const ctx: AwarenessContext = {
    userState,
    today: updatedTodayStats,
    lastNDays: lastNDaysStats,
    nowTs: Date.now(),
    nowLocalHour: getLocalHour(new Date(), userState.timezone),
    recentEvents,
  };

  // 场景 1 会在用户停留时间达到阈值时自动触发
  triggerAwareness(ctx);
}

/**
 * 示例：注册响应处理器（在 UI 层调用）
 */
export function setupAwarenessResponseHandler(): void {
  registerResponseHandler((response: AwarenessResponse) => {
    const { match, copy, heartTreeName } = response;
    
    console.log('觉察引擎触发:', {
      ruleId: match.ruleId,
      responder: match.responder,
      triggerMode: match.triggerMode,
      copy,
      heartTreeName,
    });

    // 根据 triggerMode 和 responder 渲染不同的 UI
    switch (match.triggerMode) {
      case 'LAUNCH':
        // 上线瞬间：Lumi 气泡出现
        if (match.responder === 'LUMI') {
          // 调用 UI 层显示 Lumi 气泡
          // showLumiBubble(copy);
        }
        break;
        
      case 'PASSIVE':
        // 自动被动触发：不打断操作的气泡
        if (match.responder === 'LUMI') {
          // 调用 UI 层显示 Lumi 轻提示
          // showLumiPassiveMessage(copy);
        }
        break;
        
      case 'HEART_TREE_FLOATING':
        // 心树浮窗：顶部滑出
        if (match.responder === 'HEART_TREE') {
          // 调用 UI 层显示心树浮窗
          // showHeartTreeFloating(copy, heartTreeName);
        }
        break;
    }
  });
}









