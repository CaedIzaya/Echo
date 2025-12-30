/**
 * 智能数据同步策略 Hook
 * 
 * 数据优先级分类：
 * 1. 高频变化数据（每次专注都变）：今日专注时长、本周时长
 * 2. 中频变化数据（每天最多变一次）：连续天数、每日登录
 * 3. 低频变化数据（行为触发）：等级经验、心树经验
 * 4. 极低频数据（偶尔变化）：成就、计划结构
 * 
 * 优化策略：
 * - 高频数据：优先 localStorage，专注完成后批量同步数据库
 * - 中频数据：每天首次访问时从数据库加载，缓存一天
 * - 低频数据：行为触发时立即更新 localStorage，延迟同步数据库
 * - 极低频数据：仅在触发时同步数据库
 */

import { useCallback } from 'react';
import { getUserStorage, setUserStorage } from '~/lib/userStorage';

// 数据分类标识
export type DataPriority = 'high' | 'medium' | 'low' | 'veryLow';

interface SyncConfig {
  priority: DataPriority;
  cacheKey: string;
  syncKey: string;
  cacheDuration: number; // 缓存有效期（毫秒）
}

// 数据配置映射
const DATA_CONFIGS: Record<string, SyncConfig> = {
  // 高频数据：今日专注、本周专注
  todayStats: {
    priority: 'high',
    cacheKey: 'todayStats',
    syncKey: 'todayStatsSynced',
    cacheDuration: 5 * 60 * 1000, // 5分钟缓存
  },
  weeklyStats: {
    priority: 'high',
    cacheKey: 'weeklyStats',
    syncKey: 'weeklyStatsSynced',
    cacheDuration: 5 * 60 * 1000, // 5分钟缓存
  },
  
  // 中频数据：连续天数（每天最多变一次）
  streakDays: {
    priority: 'medium',
    cacheKey: 'dashboardStats',
    syncKey: 'streakDaysSynced',
    cacheDuration: 24 * 60 * 60 * 1000, // 24小时缓存
  },
  
  // 低频数据：等级经验（行为触发）
  userExp: {
    priority: 'low',
    cacheKey: 'userExp',
    syncKey: 'userExpSynced',
    cacheDuration: 60 * 60 * 1000, // 1小时缓存
  },
  heartTreeExp: {
    priority: 'low',
    cacheKey: 'heartTreeExpState',
    syncKey: 'heartTreeExpSynced',
    cacheDuration: 60 * 60 * 1000, // 1小时缓存
  },
  
  // 极低频数据：成就、计划
  achievements: {
    priority: 'veryLow',
    cacheKey: 'achievedAchievements',
    syncKey: 'achievementsSynced',
    cacheDuration: 24 * 60 * 60 * 1000, // 24小时缓存
  },
  projects: {
    priority: 'veryLow',
    cacheKey: 'userPlans',
    syncKey: 'userPlansSynced',
    cacheDuration: 60 * 60 * 1000, // 1小时缓存
  },
};

export function useSmartDataSync() {
  // 检查缓存是否有效
  const isCacheValid = useCallback((dataKey: string): boolean => {
    if (typeof window === 'undefined') return false;
    
    const config = DATA_CONFIGS[dataKey];
    if (!config) return false;
    
    // ✅ 使用用户隔离的 localStorage
    const lastSyncAt = getUserStorage(`${config.syncKey}_at`);
    if (!lastSyncAt) return false;
    
    try {
      const lastSync = new Date(lastSyncAt);
      const now = new Date();
      const elapsed = now.getTime() - lastSync.getTime();
      
      return elapsed < config.cacheDuration;
    } catch {
      return false;
    }
  }, []);

  // 标记数据已同步
  const markSynced = useCallback((dataKey: string) => {
    if (typeof window === 'undefined') return;
    
    const config = DATA_CONFIGS[dataKey];
    if (!config) return;
    
    // ✅ 使用用户隔离的 localStorage
    setUserStorage(config.syncKey, 'true');
    setUserStorage(`${config.syncKey}_at`, new Date().toISOString());
  }, []);

  // 标记数据需要同步
  const markNeedSync = useCallback((dataKey: string) => {
    if (typeof window === 'undefined') return;
    
    const config = DATA_CONFIGS[dataKey];
    if (!config) return;
    
    // ✅ 使用用户隔离的 localStorage
    setUserStorage(config.syncKey, 'false');
  }, []);

  // 检查是否需要同步
  const needsSync = useCallback((dataKey: string): boolean => {
    if (typeof window === 'undefined') return true;
    
    const config = DATA_CONFIGS[dataKey];
    if (!config) return true;
    
    // ✅ 使用用户隔离的 localStorage
    const synced = getUserStorage(config.syncKey);
    if (synced !== 'true') return true;
    
    return !isCacheValid(dataKey);
  }, [isCacheValid]);

  // 批量同步策略（专注完成后调用）
  const batchSyncAfterFocus = useCallback(async (updates: {
    todayMinutes?: number;
    weeklyMinutes?: number;
    totalMinutes?: number;
    streakDays?: number;
    userExp?: number;
    heartTreeExp?: number;
  }) => {
    console.log('[SmartSync] 📦 批量同步专注后数据...');
    
    // 1. 立即更新 localStorage（用户体验优先）
    if (updates.todayMinutes !== undefined) {
      const today = new Date().toISOString().split('T')[0];
      // ✅ 使用用户隔离的 localStorage
      const todayStats = JSON.parse(getUserStorage('todayStats') || '{}');
      todayStats[today] = { minutes: updates.todayMinutes, date: today };
      setUserStorage('todayStats', JSON.stringify(todayStats));
    }
    
    if (updates.weeklyMinutes !== undefined) {
      // ✅ 使用用户隔离的 localStorage
      const weeklyStats = JSON.parse(getUserStorage('weeklyStats') || '{}');
      weeklyStats.totalMinutes = updates.weeklyMinutes;
      setUserStorage('weeklyStats', JSON.stringify(weeklyStats));
    }
    
    if (updates.totalMinutes !== undefined) {
      setUserStorage('totalFocusMinutes', updates.totalMinutes.toString());
    }
    
    if (updates.streakDays !== undefined) {
      // ✅ 使用用户隔离的 localStorage
      const dashboardStats = JSON.parse(getUserStorage('dashboardStats') || '{}');
      dashboardStats.streakDays = updates.streakDays;
      setUserStorage('dashboardStats', JSON.stringify(dashboardStats));
    }
    
    if (updates.userExp !== undefined) {
      setUserStorage('userExp', updates.userExp.toString());
    }
    
    if (updates.heartTreeExp !== undefined) {
      // ✅ 使用用户隔离的 localStorage
      const heartTreeState = JSON.parse(getUserStorage('heartTreeExpState') || '{}');
      heartTreeState.totalExp = updates.heartTreeExp;
      setUserStorage('heartTreeExpState', JSON.stringify(heartTreeState));
    }
    
    // 2. 延迟同步到数据库（避免阻塞UI）
    setTimeout(async () => {
      try {
        const response = await fetch('/api/dashboard/batch-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        
        if (response.ok) {
          console.log('[SmartSync] ✅ 批量同步成功');
          // 标记所有相关数据已同步
          markSynced('todayStats');
          markSynced('weeklyStats');
          markSynced('streakDays');
          markSynced('userExp');
          markSynced('heartTreeExp');
        } else {
          console.warn('[SmartSync] ⚠️ 批量同步失败，数据已保存到本地');
        }
      } catch (error) {
        console.error('[SmartSync] ❌ 批量同步异常', error);
      }
    }, 1000); // 延迟1秒，避免阻塞
  }, [markSynced]);

  return {
    isCacheValid,
    needsSync,
    markSynced,
    markNeedSync,
    batchSyncAfterFocus,
  };
}


