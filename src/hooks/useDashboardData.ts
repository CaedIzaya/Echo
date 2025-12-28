/**
 * Dashboard 数据加载 Hook
 * 
 * 目的：确保关键数据从数据库加载，localStorage 仅作为缓存
 * 优先级：数据库 > localStorage（用户隔离）
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getUserStorage, setUserStorage, userStorageJSON } from '~/lib/userStorage';

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
    // 🔥 新策略：初始化时使用默认值，等待数据库加载
    // 不再从localStorage读取，避免读到其他用户的数据
    return getDefaultData();
  });

  // 从数据库加载数据（数据库优先）
  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id) return;

    console.log('[useDashboardData] 🔄 从数据库加载数据（用户隔离）...');
    
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

      // 🔥 写入用户隔离的缓存
      userStorageJSON.set(CACHE_KEY, newData);
      setUserStorage(SYNC_KEY, 'true');
      setUserStorage('dashboardDataSyncedAt', new Date().toISOString());

      // 🔥 同步到旧的 localStorage 结构（兼容性）- 使用用户隔离
      syncToUserStorage(newData);

      console.log('[useDashboardData] 💾 数据已缓存（用户:', session.user.id, '）');

    } catch (error: any) {
      console.error('[useDashboardData] ❌ 加载失败', error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [session?.user?.id]);

  // 自动加载：登录时强制从数据库同步
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated' && session?.user?.id) {
      // 🔥 新策略：每次登录都从数据库加载，确保数据正确
      // 用户隔离的缓存仅作为备用
      const synced = getUserStorage(SYNC_KEY);
      const lastSyncAt = getUserStorage('dashboardDataSyncedAt');
      
      const needSync = !synced || !lastSyncAt || isDataStale(lastSyncAt);
      
      if (needSync) {
        console.log('[useDashboardData] 📊 从数据库加载数据（首次或过期）');
        loadFromDatabase();
      } else {
        // 先使用缓存，然后后台刷新
        const cachedData = userStorageJSON.get<DashboardData>(CACHE_KEY);
        if (cachedData) {
          setData({ ...cachedData, isLoading: false });
          console.log('[useDashboardData] ⚡ 使用用户缓存，后台刷新');
        }
        
        // 后台刷新（5秒后）
        setTimeout(() => {
          loadFromDatabase();
        }, 5000);
      }
    } else {
      // 未登录，清空数据
      setData(getDefaultData());
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [status, session?.user?.id, loadFromDatabase]);

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

// 同步到旧的 localStorage 结构（向后兼容，使用用户隔离）
function syncToUserStorage(data: DashboardData) {
  try {
    // todayStats
    const todayStats = {
      [data.todayDate]: {
        minutes: data.todayMinutes,
        date: data.todayDate,
      },
    };
    userStorageJSON.set('todayStats', todayStats);

    // weeklyStats
    const weeklyStats = {
      totalMinutes: data.weeklyMinutes,
      weekStart: data.weekStart,
    };
    userStorageJSON.set('weeklyStats', weeklyStats);

    // totalFocusMinutes
    setUserStorage('totalFocusMinutes', data.totalMinutes.toString());

    // dashboardStats
    const dashboardStats = {
      yesterdayMinutes: 0, // 需要从数据库计算
      streakDays: data.streakDays,
      completedGoals: 0, // 需要从数据库计算
    };
    userStorageJSON.set('dashboardStats', dashboardStats);

    console.log('[syncToUserStorage] ✅ 已同步到用户隔离存储');
  } catch (error) {
    console.error('[syncToUserStorage] 同步失败', error);
  }
}


