/**
 * 数据同步 Hook
 * 
 * 目的：确保 localStorage 与数据库数据一致
 * 使用：在 dashboard 组件挂载时调用
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getUserStorage, setUserStorage } from '~/lib/userStorage';

interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
}

export function useDataSync() {
  const { data: session, status } = useSession();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncAt: null,
    error: null,
  });

  /**
   * 执行完整数据同步
   */
  const syncAllData = useCallback(async () => {
    if (!session?.user?.id) {
      console.warn('[useDataSync] 用户未登录，跳过同步');
      return false;
    }

    console.log('[useDataSync] 开始数据同步...');
    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const response = await fetch('/api/user/sync-all-data');
      
      if (!response.ok) {
        throw new Error(`同步失败: ${response.status}`);
      }

      const data = await response.json();
      
      // 更新所有 localStorage 缓存
      if (typeof window !== 'undefined') {
        // ✅ 所有数据使用用户隔离的 localStorage
        // 1. 用户经验和等级
        setUserStorage('userExp', data.userExp.toString());
        setUserStorage('userExpSynced', 'true');
        
        // 2. 成就数据
        setUserStorage('achievedAchievements', JSON.stringify(data.achievements));
        
        // 3. 心树数据
        if (data.heartTreeName) {
          setUserStorage('heartTreeNameV1', data.heartTreeName);
        }
        
        // 4. 统计数据
        setUserStorage('todayStats', JSON.stringify({
          [data.todayStats.date]: {
            minutes: data.todayStats.minutes,
            date: data.todayStats.date,
          }
        }));
        
        setUserStorage('weeklyStats', JSON.stringify({
          totalMinutes: data.weeklyStats.totalMinutes,
          weekStart: data.weeklyStats.weekStart,
        }));
        
        setUserStorage('totalFocusMinutes', data.totalStats.totalMinutes.toString());
        
        // 5. 同步元数据
        setUserStorage('dataSyncedAt', data.syncedAt);
        setUserStorage('dataRecovered', 'true');
        
        console.log('[useDataSync] ✅ 数据同步完成', {
          userExp: data.userExp,
          achievements: data.achievements.length,
          totalMinutes: data.totalStats.totalMinutes,
          isNewUser: data.isReallyNewUser,
        });
      }

      setSyncStatus({
        isSyncing: false,
        lastSyncAt: data.syncedAt,
        error: null,
      });

      return true;
      
    } catch (error: any) {
      console.error('[useDataSync] 同步失败:', error);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message || '同步失败',
      }));
      return false;
    }
  }, [session?.user?.id]);

  /**
   * 检查是否需要同步
   * 
   * 判断规则：
   * 1. 今天还未同步过
   * 2. 或者检测到数据异常
   */
  const shouldSync = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    
    const lastSyncAt = getUserStorage('dataSyncedAt');
    if (!lastSyncAt) {
      console.log('[useDataSync] 从未同步过，需要同步');
      return true;
    }
    
    const lastSyncDate = new Date(lastSyncAt).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    if (lastSyncDate !== today) {
      console.log('[useDataSync] 今天还未同步，需要同步');
      return true;
    }
    
    // 检查关键数据是否存在
    const userExp = getUserStorage('userExp');
    const achievements = getUserStorage('achievedAchievements');
    
    if (!userExp || !achievements) {
      console.log('[useDataSync] 关键数据缺失，需要同步');
      return true;
    }
    
    return false;
  }, []);

  /**
   * 自动同步：登录时检查并同步
   */
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'authenticated' && shouldSync()) {
      // 延迟500ms，避免与其他初始化逻辑冲突
      const timer = setTimeout(() => {
        syncAllData();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [status, shouldSync, syncAllData]);

  return {
    syncStatus,
    syncAllData,
    shouldSync,
  };
}












