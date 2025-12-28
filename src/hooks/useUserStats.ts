import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getUserStorage, setUserStorage } from '~/lib/userStorage';

interface UserStats {
  streakDays: number;
  lastStreakDate: string | null;
  totalFocusMinutes: number;
}

const STORAGE_KEY_STREAK = 'userStreakDays';
const STORAGE_KEY_TOTAL = 'totalFocusMinutes';
const SYNC_KEY = 'userStatsSync';

/**
 * 用户统计数据管理 Hook
 * 
 * 功能：
 * - 管理连续天数和总时长
 * - 双重存储：数据库 + localStorage
 * - 自动同步到数据库
 * - 数据恢复机制
 */
export function useUserStats() {
  const { data: session } = useSession();
  const [streakDays, setStreakDays] = useState(0);
  const [lastStreakDate, setLastStreakDate] = useState<string | null>(null);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 从数据库加载数据（数据库优先）
  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        const data = await response.json();
        const dbStreakDays = data.stats.streakDays || 0;
        const dbLastStreakDate = data.stats.lastStreakDate || null;
        const dbTotalMinutes = data.stats.totalFocusMinutes || 0;

        // 🔥 新策略：数据库优先！只对比用户隔离的localStorage
        const localStreakDays = parseInt(getUserStorage(STORAGE_KEY_STREAK) || '0');
        const localTotalMinutes = parseInt(getUserStorage(STORAGE_KEY_TOTAL) || '0');

        // 使用较大值（防止数据丢失）
        const finalStreakDays = Math.max(dbStreakDays, localStreakDays);
        const finalTotalMinutes = Math.max(dbTotalMinutes, localTotalMinutes);

        // 如果 localStorage 的值更大，同步到数据库
        if (localStreakDays > dbStreakDays || localTotalMinutes > dbTotalMinutes) {
          console.warn('[useUserStats] ⚠️ 用户localStorage数据高于数据库，同步到数据库');
          await fetch('/api/user/stats/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              streakDays: finalStreakDays,
              totalFocusMinutes: finalTotalMinutes,
            }),
          });
        }

        // 更新状态（以数据库/最大值为准）
        setStreakDays(finalStreakDays);
        setLastStreakDate(dbLastStreakDate);
        setTotalFocusMinutes(finalTotalMinutes);

        // 更新用户隔离的localStorage缓存
        setUserStorage(STORAGE_KEY_STREAK, finalStreakDays.toString());
        setUserStorage(STORAGE_KEY_TOTAL, finalTotalMinutes.toString());
        setUserStorage(SYNC_KEY, 'true');

        console.log('[useUserStats] ✅ 数据加载完成（用户隔离）:', {
          userId: session.user.id,
          streakDays: finalStreakDays,
          totalMinutes: finalTotalMinutes,
        });
      }
    } catch (error) {
      console.error('[useUserStats] ❌ 加载失败:', error);
      // 失败时使用用户隔离的localStorage
      const localStreakDays = parseInt(getUserStorage(STORAGE_KEY_STREAK) || '0');
      const localTotalMinutes = parseInt(getUserStorage(STORAGE_KEY_TOTAL) || '0');
      if (localStreakDays > 0) setStreakDays(localStreakDays);
      if (localTotalMinutes > 0) setTotalFocusMinutes(localTotalMinutes);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // 组件挂载时加载数据
  useEffect(() => {
    if (session?.user?.id) {
      loadFromDatabase();
    } else {
      setIsLoading(false);
    }
  }, [session?.user?.id, loadFromDatabase]);

  // 更新连续天数
  const updateStreakDays = useCallback(async (newStreakDays: number, date: string) => {
    if (!session?.user?.id) {
      console.warn('[useUserStats] 未登录，只更新用户localStorage');
      setStreakDays(newStreakDays);
      setLastStreakDate(date);
      setUserStorage(STORAGE_KEY_STREAK, newStreakDays.toString());
      return;
    }

    try {
      // 1. 先更新本地状态和用户隔离的localStorage
      setStreakDays(newStreakDays);
      setLastStreakDate(date);
      setUserStorage(STORAGE_KEY_STREAK, newStreakDays.toString());

      // 2. 立即同步到数据库
      const response = await fetch('/api/user/stats/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streakDays: newStreakDays,
          lastStreakDate: date,
        }),
      });

      if (response.ok) {
        console.log('[useUserStats] ✅ 连续天数同步成功:', { streakDays: newStreakDays, date });
      } else {
        console.error('[useUserStats] ❌ 连续天数同步失败:', await response.json());
      }
    } catch (error) {
      console.error('[useUserStats] ❌ 连续天数更新异常:', error);
    }
  }, [session?.user?.id]);

  // 更新总时长
  const updateTotalMinutes = useCallback(async (minutes: number) => {
    if (!session?.user?.id) {
      console.warn('[useUserStats] 未登录，只更新用户localStorage');
      const newTotal = totalFocusMinutes + minutes;
      setTotalFocusMinutes(newTotal);
      setUserStorage(STORAGE_KEY_TOTAL, newTotal.toString());
      return;
    }

    try {
      const newTotal = totalFocusMinutes + minutes;
      
      // 1. 先更新本地状态和用户隔离的localStorage
      setTotalFocusMinutes(newTotal);
      setUserStorage(STORAGE_KEY_TOTAL, newTotal.toString());

      // 2. 立即同步到数据库
      const response = await fetch('/api/user/stats/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalFocusMinutes: newTotal,
        }),
      });

      if (response.ok) {
        console.log('[useUserStats] ✅ 总时长同步成功:', { totalMinutes: newTotal });
      } else {
        console.error('[useUserStats] ❌ 总时长同步失败:', await response.json());
      }
    } catch (error) {
      console.error('[useUserStats] ❌ 总时长更新异常:', error);
    }
  }, [session?.user?.id, totalFocusMinutes]);

  return {
    streakDays,
    lastStreakDate,
    totalFocusMinutes,
    isLoading,
    updateStreakDays,
    updateTotalMinutes,
    reload: loadFromDatabase,
  };
}



