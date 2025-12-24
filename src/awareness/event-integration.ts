/**
 * 深度觉察引擎 - 事件集成
 * 在关键事件发生时触发觉察检测
 */

import { AwarenessContext } from './types';
import { triggerAwareness, buildAwarenessContext } from './index';

/**
 * 事件数据获取接口（需要根据你的实际系统实现）
 */
interface EventDataProviders {
  getUserData: () => Promise<any>;
  getTodayStats: () => Promise<any>;
  getLastNDaysStats: (days: number) => Promise<any[]>;
  getRecentEvents: (minutes: number) => Promise<any[]>;
}

/**
 * App 启动时触发觉察检测
 */
export async function onAppLaunch(
  userId: string,
  providers: EventDataProviders
): Promise<void> {
  try {
    const ctx = await buildAwarenessContext(
      userId,
      providers.getUserData,
      providers.getTodayStats,
      providers.getLastNDaysStats,
      providers.getRecentEvents
    );

    // 触发觉察检测（场景 2 和 5 会在 LAUNCH 模式触发）
    triggerAwareness(ctx);
  } catch (error) {
    console.error('App 启动时觉察检测失败:', error);
  }
}

/**
 * 专注计时器结束时触发觉察检测
 */
export async function onFocusTimerEnd(
  userId: string,
  durationMinutes: number,
  providers: EventDataProviders
): Promise<void> {
  try {
    // 更新统计数据（在实际系统中应该通过 API 更新）
    // await updateFocusStats(userId, durationMinutes);

    const ctx = await buildAwarenessContext(
      userId,
      providers.getUserData,
      providers.getTodayStats,
      providers.getLastNDaysStats,
      providers.getRecentEvents
    );

    // 触发觉察检测（场景 4 会在多次短专注时触发）
    triggerAwareness(ctx);
  } catch (error) {
    console.error('专注结束时觉察检测失败:', error);
  }
}

/**
 * Lumi 被点击时触发觉察检测
 */
export async function onLumiClick(
  userId: string,
  providers: EventDataProviders
): Promise<void> {
  try {
    // 更新点击计数（在实际系统中应该通过 API 更新）
    // await incrementLumiClickCount(userId);

    const ctx = await buildAwarenessContext(
      userId,
      providers.getUserData,
      providers.getTodayStats,
      providers.getLastNDaysStats,
      providers.getRecentEvents
    );

    // 触发觉察检测（场景 6 会在点击太多次时触发）
    triggerAwareness(ctx);
  } catch (error) {
    console.error('Lumi 点击时觉察检测失败:', error);
  }
}

/**
 * App 前台停留时间更新时触发觉察检测
 */
export async function onAppForegroundUpdate(
  userId: string,
  foregroundMinutes: number,
  homeStayMinutes: number,
  providers: EventDataProviders
): Promise<void> {
  try {
    // 更新前台停留时间（在实际系统中应该通过 API 更新）
    // await updateForegroundStats(userId, foregroundMinutes, homeStayMinutes);

    const ctx = await buildAwarenessContext(
      userId,
      providers.getUserData,
      providers.getTodayStats,
      providers.getLastNDaysStats,
      providers.getRecentEvents
    );

    // 触发觉察检测（场景 1 会在挂机不专注时触发）
    triggerAwareness(ctx);
  } catch (error) {
    console.error('前台更新时觉察检测失败:', error);
  }
}

/**
 * 打开心树页面时触发觉察检测
 */
export async function onHeartTreeOpen(
  userId: string,
  providers: EventDataProviders
): Promise<void> {
  try {
    const ctx = await buildAwarenessContext(
      userId,
      providers.getUserData,
      providers.getTodayStats,
      providers.getLastNDaysStats,
      providers.getRecentEvents
    );

    // 触发觉察检测（场景 3 会在连续未完成目标时触发）
    triggerAwareness(ctx);
  } catch (error) {
    console.error('打开心树时觉察检测失败:', error);
  }
}




















