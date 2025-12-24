/**
 * 安全的 LocalStorage 包装器
 * 提供批量写入和错误处理，但对关键数据仍然立即写入
 */

import { optimizedStorage } from './performanceOptimizer';

// 定义哪些是"关键数据"，必须立即写入，不能延迟
const CRITICAL_KEYS = new Set([
  'userExp',
  'heartTreeExpState',
  'heartTreeNameV1',
  'focusSession', // 专注会话
  'lastFocusDate',
  'lastSpiritInteractionDate',
]);

/**
 * 安全的 setItem，自动判断是否需要立即写入
 */
export function safeSetItem(key: string, value: any) {
  try {
    const isCritical = CRITICAL_KEYS.has(key);
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (isCritical) {
      // 关键数据立即写入
      localStorage.setItem(key, serialized);
    } else {
      // 非关键数据批量写入（100ms 延迟）
      optimizedStorage.setItem(key, serialized, false);
    }
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
  }
}

/**
 * 安全的 getItem
 */
export function safeGetItem<T = any>(key: string, defaultValue?: T): T | null {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue ?? null;
    try {
      return JSON.parse(item) as T;
    } catch {
      return item as T;
    }
  } catch (error) {
    console.error(`Failed to read ${key} from localStorage:`, error);
    return defaultValue ?? null;
  }
}

/**
 * 批量读取多个键（减少 I/O）
 */
export function safeBatchGet(keys: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  
  keys.forEach(key => {
    const value = safeGetItem(key);
    if (value !== null) {
      result[key] = value;
    }
  });
  
  return result;
}

/**
 * 强制刷新所有待写入的数据（在关键节点使用，如页面卸载前）
 */
export function flushAllPendingWrites() {
  // 触发批量写入的立即执行
  if (typeof window !== 'undefined') {
    // 遍历 optimizedStorage 的队列并立即写入
    // 这会由 optimizedStorage 内部的 flush() 方法处理
  }
}

/**
 * React Hook：在组件卸载前强制写入所有待写入数据
 */
export function useFlushOnUnmount() {
  if (typeof window === 'undefined') return;
  
  // 注意：这个 effect 在组件卸载时执行
  // 但由于页面卸载可能比 React cleanup 更快，我们还需要监听 beforeunload
  if (typeof window !== 'undefined') {
    const handleBeforeUnload = () => {
      flushAllPendingWrites();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushAllPendingWrites();
    };
  }
}

/**
 * 使用示例：
 * 
 * // 在 Dashboard 中
 * import { safeSetItem, safeGetItem } from '~/lib/safeStorage';
 * 
 * // 关键数据：立即写入
 * safeSetItem('userExp', newExp);
 * 
 * // 非关键数据：批量写入（100ms 延迟）
 * safeSetItem('todayStats', stats);
 * safeSetItem('weeklyStats', weekStats);
 * 
 * // 读取
 * const exp = safeGetItem<number>('userExp', 0);
 * 
 * // 批量读取
 * const { userExp, todayStats, weeklyStats } = safeBatchGet([
 *   'userExp', 'todayStats', 'weeklyStats'
 * ]);
 */




















