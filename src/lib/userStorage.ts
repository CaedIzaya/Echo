/**
 * 用户隔离的localStorage工具类
 * 确保每个账号的数据独立存储，不会相互干扰
 */

// 获取当前用户ID（从session storage临时缓存）
let currentUserId: string | null = null;

export function setCurrentUserId(userId: string) {
  currentUserId = userId;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('currentUserId', userId);
  }
}

export function getCurrentUserId(): string | null {
  if (currentUserId) return currentUserId;
  if (typeof window !== 'undefined') {
    currentUserId = sessionStorage.getItem('currentUserId');
  }
  return currentUserId;
}

export function clearCurrentUserId() {
  currentUserId = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('currentUserId');
  }
}

/**
 * 生成用户特定的key
 * @param key 原始key
 * @returns 带用户ID前缀的key，如: user_123_plans
 */
function getUserKey(key: string): string {
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn(`尝试访问 ${key} 但未设置用户ID，使用全局key`);
    return key; // 如果没有用户ID，使用全局key
  }
  return `user_${userId}_${key}`;
}

/**
 * 获取用户隔离的localStorage数据
 * @param key 数据key
 * @returns 数据值或null
 */
export function getUserStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(getUserKey(key));
  } catch (error) {
    console.error('读取localStorage失败:', error);
    return null;
  }
}

/**
 * 设置用户隔离的localStorage数据
 * @param key 数据key
 * @param value 数据值
 */
export function setUserStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getUserKey(key), value);
  } catch (error) {
    console.error('写入localStorage失败:', error);
  }
}

/**
 * 删除用户隔离的localStorage数据
 * @param key 数据key
 */
export function removeUserStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getUserKey(key));
  } catch (error) {
    console.error('删除localStorage失败:', error);
  }
}

/**
 * 清除当前用户的所有数据
 */
export function clearUserStorage(): void {
  if (typeof window === 'undefined') return;
  const userId = getCurrentUserId();
  if (!userId) return;
  
  try {
    const prefix = `user_${userId}_`;
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`清除用户 ${userId} 的 ${keysToRemove.length} 条数据`);
  } catch (error) {
    console.error('清除用户数据失败:', error);
  }
}

/**
 * 从旧的全局localStorage迁移到用户隔离存储
 * @param keys 需要迁移的key列表
 */
export function migrateToUserStorage(keys: string[]): void {
  if (typeof window === 'undefined') return;
  const userId = getCurrentUserId();
  if (!userId) return;
  
  try {
    keys.forEach(key => {
      const oldValue = localStorage.getItem(key);
      if (oldValue) {
        const newKey = getUserKey(key);
        // 只在新key不存在时迁移
        if (!localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, oldValue);
          console.log(`迁移数据: ${key} -> ${newKey}`);
        }
        // 可选：删除旧的全局key（谨慎操作）
        // localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('迁移数据失败:', error);
  }
}

/**
 * JSON格式的用户存储操作
 */
export const userStorageJSON = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    const value = getUserStorage(key);
    if (!value) return defaultValue ?? null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue ?? null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      setUserStorage(key, JSON.stringify(value));
    } catch (error) {
      console.error('写入JSON失败:', error);
    }
  },
  
  remove: (key: string): void => {
    removeUserStorage(key);
  }
};

