import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getUserStorage, setUserStorage, userStorageJSON } from '~/lib/userStorage';

const STORAGE_KEY = 'achievedAchievements';
const SYNC_KEY = 'achievementsSynced';

/**
 * 成就管理 Hook
 * - 优先从数据库读取（跨设备同步）
 * - 缓存到 localStorage（快速访问）
 * - 修改时同时更新数据库和 localStorage
 */
export function useAchievements() {
  const { data: session, status } = useSession();
  const [achievedIds, setAchievedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // 从数据库加载成就（数据库优先）
  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/achievements');
      if (response.ok) {
        const data = await response.json() as { achievements: Array<{ id: string; category: string; unlockedAt: string }> };
        const ids = new Set<string>(data.achievements.map((a) => a.id));
        
        // 更新状态和用户隔离的localStorage
        setAchievedIds(ids);
        userStorageJSON.set(STORAGE_KEY, Array.from(ids));
        setUserStorage(SYNC_KEY, 'true');
        setUserStorage('achievementsSyncedAt', new Date().toISOString());
        
        console.log('[useAchievements] ✅ 从数据库加载成就:', ids.size, '个（用户:', session.user.id, '）');
      }
    } catch (error) {
      console.error('[useAchievements] ❌ 加载失败:', error);
      // 失败时使用用户隔离的localStorage
      const stored = getUserStorage(STORAGE_KEY);
      if (stored) {
        try {
          const idsArray = JSON.parse(stored) as string[];
          const ids = new Set<string>(idsArray);
          setAchievedIds(ids);
        } catch (e) {
          console.error('[useAchievements] 解析失败:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // 初始化（数据库优先）
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated' && session?.user?.id) {
      // 🔥 新策略：从数据库加载，确保数据正确
      const synced = getUserStorage(SYNC_KEY);
      const lastSyncAt = getUserStorage('achievementsSyncedAt');
      
      const needSync = !synced || !lastSyncAt || isAchievementDataStale(lastSyncAt);
      
      if (needSync) {
        console.log('[useAchievements] 📊 从数据库加载成就（首次或超过24小时）');
        loadFromDatabase();
      } else {
        // 先用缓存，后台刷新
        const storedArray = userStorageJSON.get<string[]>(STORAGE_KEY);
        if (storedArray) {
          const ids = new Set<string>(storedArray);
          setAchievedIds(ids);
        }
        setIsLoading(false);
        console.log('[useAchievements] ⚡ 使用用户缓存');
      }
    } else {
      // 未登录，清空数据
      setAchievedIds(new Set());
      setIsLoading(false);
    }
  }, [status, session?.user?.id, loadFromDatabase]);

  // 解锁成就（立即同步到数据库）
  const unlockAchievement = useCallback(async (achievementId: string, category: string) => {
    if (achievedIds.has(achievementId)) {
      console.log('[useAchievements] 成就已解锁:', achievementId);
      return false; // 已解锁
    }

    setIsUnlocking(true);

    try {
      // 1. 立即更新本地状态和用户localStorage
      const newIds = new Set(achievedIds);
      newIds.add(achievementId);
      setAchievedIds(newIds);
      userStorageJSON.set(STORAGE_KEY, Array.from(newIds));

      // 2. 立即同步到数据库
      if (session?.user?.id) {
        setUserStorage(SYNC_KEY, 'false');
        
        const response = await fetch('/api/achievements/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ achievementId, category }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[useAchievements] ❌ 保存到数据库失败:', error);
        } else {
          console.log('[useAchievements] ✅ 成就已同步到数据库:', achievementId);
          setUserStorage(SYNC_KEY, 'true');
          setUserStorage('achievementsSyncedAt', new Date().toISOString());
        }
      }

      return true; // 新解锁
    } catch (error) {
      console.error('[useAchievements] ❌ 解锁失败:', error);
      return false;
    } finally {
      setIsUnlocking(false);
    }
  }, [achievedIds, session?.user?.id]);

  // 批量解锁成就
  const unlockAchievements = useCallback(async (achievements: Array<{ id: string; category: string }>) => {
    const newlyUnlocked: string[] = [];

    for (const achievement of achievements) {
      if (!achievedIds.has(achievement.id)) {
        const unlocked = await unlockAchievement(achievement.id, achievement.category);
        if (unlocked) {
          newlyUnlocked.push(achievement.id);
        }
      }
    }

    return newlyUnlocked;
  }, [achievedIds, unlockAchievement]);

  // 检查是否已解锁
  const isAchievementUnlocked = useCallback((achievementId: string) => {
    return achievedIds.has(achievementId);
  }, [achievedIds]);

  // 手动同步到数据库
  const syncToDatabase = useCallback(async () => {
    if (!session?.user?.id) return false;

    const storedArray = userStorageJSON.get<string[]>(STORAGE_KEY);
    if (!storedArray || storedArray.length === 0) {
      return true;
    }

    try {
      let successCount = 0;

      for (const id of storedArray) {
        // 假设 category 为 'common'，实际应该从成就定义中获取
        const response = await fetch('/api/achievements/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ achievementId: id, category: 'common' }),
        });

        if (response.ok) {
          successCount++;
        }
      }

      console.log(`[useAchievements] ✅ 同步成功 ${successCount}/${storedArray.length} 个成就`);
      setUserStorage(SYNC_KEY, 'true');
      setUserStorage('achievementsSyncedAt', new Date().toISOString());
      return true;
    } catch (error) {
      console.error('[useAchievements] ❌ 同步失败:', error);
      return false;
    }
  }, [session?.user?.id]);

  return {
    achievedIds,
    achievedCount: achievedIds.size,
    isLoading,
    isUnlocking,
    unlockAchievement,
    unlockAchievements,
    isAchievementUnlocked,
    syncToDatabase,
    reload: loadFromDatabase,
  };
}

// 检查成就数据是否过期（24小时）
function isAchievementDataStale(lastSyncAt: string): boolean {
  try {
    const lastSync = new Date(lastSyncAt);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    // 成就数据超过24小时视为过期（极低频数据）
    return hoursSinceSync > 24;
  } catch {
    return true;
  }
}

