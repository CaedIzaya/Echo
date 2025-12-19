/**
 * 深度觉察引擎 - 工具函数
 */

import { Event } from './types';

/**
 * 计算两个日期之间的天数差
 */
export function diffInDays(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / 86400000);
}

/**
 * 判断时间戳是否在指定分钟数内
 */
export function isWithinMinutes(ts: number, now: number, minutes: number): boolean {
  return now - ts <= minutes * 60 * 1000;
}

/**
 * 获取最近 N 分钟内、时长小于 thresholdMin 的专注会话
 * 用于检测"多次尝试但都失败"的场景
 */
export function getShortFocusSessions(
  events: Event[],
  windowMinutes: number,
  thresholdMin: number
): Event[] {
  const now = Date.now();
  const withinWindow = events.filter(e => isWithinMinutes(e.ts, now, windowMinutes));
  
  // 查找 FOCUS_TIMER_END 或 FOCUS_TIMER_CANCEL 事件
  // 且持续时间小于阈值
  return withinWindow.filter(e => {
    if (e.type !== 'FOCUS_TIMER_END' && e.type !== 'FOCUS_TIMER_CANCEL') {
      return false;
    }
    
    // 从 meta 中获取持续时间（分钟）
    const duration = e.meta?.durationMinutes;
    return duration !== undefined && duration < thresholdMin;
  });
}

/**
 * 格式化日期为 yyyy-MM-dd
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取本地时间的小时数（0-23）
 */
export function getLocalHour(date: Date, timezone: string = 'Asia/Shanghai'): number {
  // 简化实现：如果时区是 Asia/Shanghai，直接使用本地时间
  // 实际项目中可以使用 date-fns-tz 或类似库
  if (timezone === 'Asia/Shanghai' || timezone.includes('Shanghai')) {
    return date.getHours();
  }
  // 其他时区可以扩展
  return date.getHours();
}









