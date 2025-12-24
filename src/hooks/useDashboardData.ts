/**
 * Dashboard 数据加载 Hook
 * 
 * 目的：确保关键数据从数据库加载，localStorage 仅作为缓存
 * 优先级：数据库 > localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface DashboardData {
  // 今日统计
  todayMinutes: number;
  todayDate: string;
  
  // 本周统计
  weeklyMinutes: number;
  weekStart: string;
  
  // 累计统计
  totalMinutes: number;
  streakDays: number;
  lastStreakDate: string | null;
  
  // 加载状态
  isLoading: boolean;
  lastSyncAt: string | null;
}

const CACHE_KEY = 'dashboardDataCache';
const SYNC_KEY = 'dashboardDataSynced';

export function useDashboardData() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<DashboardData>(() => {
    // 初始化时先从缓存读取
    if (typeof window === 'undefined') {
      return getDefaultData();
    }
    
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return getDefaultData();
      }
    }
    
    return getDefaultData();
  });

  // 从数据库加载数据
  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id) return;

    console.log('[useDashboardData] 🔄 开始从数据库加载关键数据...');
    
    setData(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/dashboard/stats');
      
      if (!response.ok) {
        throw new Error(`加载失败: ${response.status}`);
      }

      const dbData = await response.json();
      
      console.log('[useDashboardData] ✅ 数据库数据加载成功', dbData);

      const newData: DashboardData = {
        todayMinutes: dbData.todayMinutes || 0,
        todayDate: dbData.todayDate || new Date().toISOString().split('T')[0],
        weeklyMinutes: dbData.weeklyMinutes || 0,
        weekStart: dbData.weekStart || getCurrentWeekStart(),
        totalMinutes: dbData.totalMinutes || 0,
        streakDays: dbData.streakDays || 0,
        lastStreakDate: dbData.lastStreakDate || null,
        isLoading: false,
        lastSyncAt: new Date().toISOString(),
      };

      // 更新状态
      setData(newData);

      // 写入缓存
      localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
      localStorage.setItem(SYNC_KEY, 'true');
      localStorage.setItem('dashboardDataSyncedAt', new Date().toISOString());

      // 🔥 同步到旧的 localStorage 结构（兼容性）
      syncToLegacyStorage(newData);

      console.log('[useDashboardData] 💾 数据已缓存到 localStorage');

    } catch (error: any) {
      console.error('[useDashboardData] ❌ 加载失败', error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [session?.user?.id]);

  // 自动加载：登录时检查并同步
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated') {
      const synced = localStorage.getItem(SYNC_KEY);
      const lastSyncAt = localStorage.getItem('dashboardDataSyncedAt');
      
      // 检查是否需要同步
      const needSync = !synced || !lastSyncAt || isDataStale(lastSyncAt);
      
      if (needSync) {
        console.log('[useDashboardData] 需要同步数据（首次加载或数据过期）');
        loadFromDatabase();
      } else {
        console.log('[useDashboardData] 使用缓存数据');
        setData(prev => ({ ...prev, isLoading: false }));
        
        // 后台静默同步
        setTimeout(() => {
          loadFromDatabase();
        }, 2000);
      }
    } else {
      // 未登录，使用缓存数据
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [status, loadFromDatabase]);

  // 手动刷新
  const refresh = useCallback(() => {
    return loadFromDatabase();
  }, [loadFromDatabase]);

  return {
    data,
    refresh,
    isLoading: data.isLoading,
  };
}

// 辅助函数

function getDefaultData(): DashboardData {
  const today = new Date().toISOString().split('T')[0];
  return {
    todayMinutes: 0,
    todayDate: today,
    weeklyMinutes: 0,
    weekStart: getCurrentWeekStart(),
    totalMinutes: 0,
    streakDays: 0,
    lastStreakDate: null,
    isLoading: true,
    lastSyncAt: null,
  };
}

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

function isDataStale(lastSyncAt: string): boolean {
  try {
    const lastSync = new Date(lastSyncAt);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    // 数据超过1小时视为过期
    return hoursSinceSync > 1;
  } catch {
    return true;
  }
}

// 同步到旧的 localStorage 结构（向后兼容）
function syncToLegacyStorage(data: DashboardData) {
  try {
    // todayStats
    const todayStats = {
      [data.todayDate]: {
        minutes: data.todayMinutes,
        date: data.todayDate,
      },
    };
    localStorage.setItem('todayStats', JSON.stringify(todayStats));

    // weeklyStats
    const weeklyStats = {
      totalMinutes: data.weeklyMinutes,
      weekStart: data.weekStart,
    };
    localStorage.setItem('weeklyStats', JSON.stringify(weeklyStats));

    // totalFocusMinutes
    localStorage.setItem('totalFocusMinutes', data.totalMinutes.toString());

    // dashboardStats
    const dashboardStats = {
      yesterdayMinutes: 0, // 需要从数据库计算
      streakDays: data.streakDays,
      completedGoals: 0, // 需要从数据库计算
    };
    localStorage.setItem('dashboardStats', JSON.stringify(dashboardStats));

    console.log('[syncToLegacyStorage] ✅ 已同步到旧存储结构');
  } catch (error) {
    console.error('[syncToLegacyStorage] 同步失败', error);
  }
}


