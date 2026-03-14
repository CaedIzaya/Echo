/**
 * Dashboard 数据加载 Hook
 * 
 * 目的：确保关键数据从数据库加载，localStorage 仅作为缓存
 * 优先级：数据库 > localStorage
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { setUserStorage } from '~/lib/userStorage';
import { trackEffect } from '~/lib/debugTools';

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
  echoCompanionDays: number;
  lastEchoCompanionDate: string | null;
  
  // 加载状态
  isLoading: boolean;
  lastSyncAt: string | null;
}

const CACHE_KEY = 'dashboardDataCache';
const SYNC_KEY = 'dashboardDataSynced';

export function useDashboardData() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<DashboardData>(() => getDefaultData());

  // 从数据库加载数据
  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id) return;

    console.log('[useDashboardData] 🔄 开始从数据库加载关键数据...');
    
    // 🔥 不再设置中间的 loading 状态，避免额外的渲染
    // setData(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/dashboard/stats');
      
      if (!response.ok) {
        console.warn('[useDashboardData] 加载失败:', response.status);
        setData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const dbData = await response.json();
      
      console.log('[useDashboardData] ✅ 数据库数据加载成功', {
        todayMinutes: dbData.todayMinutes,
        todayDate: dbData.todayDate,
        weeklyMinutes: dbData.weeklyMinutes,
        totalMinutes: dbData.totalMinutes,
        streakDays: dbData.streakDays,
      });

      const newData: DashboardData = {
        todayMinutes: dbData.todayMinutes || 0,
        todayDate: dbData.todayDate || new Date().toISOString().split('T')[0],
        weeklyMinutes: dbData.weeklyMinutes || 0,
        weekStart: dbData.weekStart || getCurrentWeekStart(),
        totalMinutes: dbData.totalMinutes || 0,
        streakDays: dbData.streakDays || 0,
        lastStreakDate: dbData.lastStreakDate || null,
        echoCompanionDays: dbData.echoCompanionDays || 0,
        lastEchoCompanionDate: dbData.lastEchoCompanionDate || null,
        isLoading: false,
        lastSyncAt: new Date().toISOString(),
      };

      // 🔥 一次性更新所有数据，避免多次渲染
      setData(newData);

      // 写入缓存
      // ✅ 使用用户隔离的 localStorage
      setUserStorage(CACHE_KEY, JSON.stringify(newData));
      setUserStorage(SYNC_KEY, 'true');
      setUserStorage('dashboardDataSyncedAt', new Date().toISOString());

      // 🔥 同步到旧的 localStorage 结构（兼容性）
      syncToLegacyStorage(newData);

      console.log('[useDashboardData] 💾 数据已缓存到 localStorage');

    } catch (error: any) {
      console.error('[useDashboardData] ❌ 加载失败', error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [session?.user?.id]);

  // 自动加载：每次登录都从数据库加载
  useEffect(() => {
    trackEffect('useDashboardData', 'autoLoad');
    
    if (status === 'loading') return;

    if (status === 'authenticated') {
      console.log('[useDashboardData] 🔥 登录检测到，从数据库加载统计数据');
      loadFromDatabase();
    } else {
      // 未登录，清空数据
      setData(getDefaultData());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // 🔥 只依赖 status，loadFromDatabase 在函数内部调用

  // 手动刷新 - 直接返回 loadFromDatabase 函数
  const refresh = loadFromDatabase;

  // 🔥 使用 useMemo 稳定返回值，避免每次渲染都创建新对象
  const stableData = useMemo(() => data, [
    data.todayMinutes,
    data.todayDate,
    data.weeklyMinutes,
    data.weekStart,
    data.totalMinutes,
    data.streakDays,
    data.lastStreakDate,
    data.echoCompanionDays,
    data.lastEchoCompanionDate,
    data.isLoading,
    data.lastSyncAt,
  ]);

  return {
    data: stableData,
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
    echoCompanionDays: 0,
    lastEchoCompanionDate: null,
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

// 同步到旧的 localStorage 结构（向后兼容 - 使用用户隔离）
function syncToLegacyStorage(data: DashboardData) {
  try {
    // todayStats
    const todayStats = {
      [data.todayDate]: {
        minutes: data.todayMinutes,
        date: data.todayDate,
      },
    };
    setUserStorage('todayStats', JSON.stringify(todayStats));

    // weeklyStats
    const weeklyStats = {
      totalMinutes: data.weeklyMinutes,
      weekStart: data.weekStart,
    };
    setUserStorage('weeklyStats', JSON.stringify(weeklyStats));

    // totalFocusMinutes
    setUserStorage('totalFocusMinutes', data.totalMinutes.toString());

    // dashboardStats — 仅写入用户隔离 localStorage，避免多账号串值
    const dashboardStats = {
      yesterdayMinutes: 0,
      streakDays: data.streakDays,
      echoCompanionDays: data.echoCompanionDays,
      completedGoals: 0,
    };
    const dashboardStatsJson = JSON.stringify(dashboardStats);
    setUserStorage('dashboardStats', dashboardStatsJson);

    console.log('[syncToLegacyStorage] ✅ 已同步到旧存储结构（用户隔离）');
  } catch (error) {
    console.error('[syncToLegacyStorage] 同步失败', error);
  }
}


