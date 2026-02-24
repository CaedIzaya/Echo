import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getUserStorage, setUserStorage } from '~/lib/userStorage';
import { trackEffect } from '~/lib/debugTools';

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
  const [achievedCount, setAchievedCount] = useState(0); // 🔥 添加计数器，避免 Set 引用变化
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // 从数据库加载成就
  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/achievements');
      if (response.ok) {
        const data = await response.json() as { achievements: Array<{ id: string; category: string; unlockedAt: string }> };
        const dbIds = data.achievements.map((a) => a.id);
        const stored = getUserStorage(STORAGE_KEY);
        let localIds: string[] = [];
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as unknown;
            if (Array.isArray(parsed)) {
              localIds = parsed.filter((id): id is string => typeof id === 'string');
            }
          } catch {
            localIds = [];
          }
        }
        const ids = new Set<string>([...localIds, ...dbIds]);
        
        // 更新状态和 localStorage
        setAchievedIds(ids);
        setAchievedCount(ids.size); // 🔥 同步更新计数器
        // ✅ 使用用户隔离的 localStorage
        setUserStorage(STORAGE_KEY, JSON.stringify(Array.from(ids)));
        setUserStorage(SYNC_KEY, 'true');
        
        console.log('[useAchievements] 从数据库加载成就:', ids.size, '个');
      }
    } catch (error) {
      console.error('[useAchievements] 加载失败:', error);
      // 失败时使用 localStorage 的值
      // ✅ 使用用户隔离的 localStorage
      const stored = getUserStorage(STORAGE_KEY);
      if (stored) {
        try {
          const idsArray = JSON.parse(stored) as string[];
          const ids = new Set<string>(idsArray);
          setAchievedIds(ids);
          setAchievedCount(ids.size); // 🔥 同步更新计数器
        } catch (e) {
          console.error('[useAchievements] 解析 localStorage 失败:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // 初始化
  useEffect(() => {
    trackEffect('useAchievements', 'init');
    console.log('[useAchievements] init triggered, status:', status);
    
    if (status === 'loading') return;

    if (status === 'authenticated') {
      console.log('[useAchievements] 🔥 登录检测到，从数据库加载成就数据');
      
      // 先显示缓存（避免闪烁）
      const stored = getUserStorage(STORAGE_KEY);
      if (stored) {
        try {
          const idsArray = JSON.parse(stored) as string[];
          const ids = new Set<string>(idsArray);
          setAchievedIds(ids);
          setAchievedCount(ids.size); // 🔥 同步更新计数器
          console.log('[useAchievements] ⚡ 临时显示缓存:', ids.size, '个');
        } catch (e) {
          console.error('[useAchievements] 解析失败:', e);
        }
      }
      setIsLoading(false);
      
      // 🔥 每次登录都从数据库加载
      loadFromDatabase();
    } else {
      // 未登录，清空数据
      setAchievedIds(new Set());
      setAchievedCount(0); // 🔥 同步更新计数器
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // 🔥 只依赖 status，loadFromDatabase 在函数内部调用

  // 解锁成就
  const unlockAchievement = useCallback(async (achievementId: string, category: string) => {
    if (achievedIds.has(achievementId)) {
      console.log('[useAchievements] 成就已解锁:', achievementId);
      return false; // 已解锁
    }

    setIsUnlocking(true);

    try {
      // 立即更新 localStorage
      const newIds = new Set(achievedIds);
      newIds.add(achievementId);
      setAchievedIds(newIds);
      setAchievedCount(newIds.size); // 🔥 同步更新计数器
      // ✅ 使用用户隔离的 localStorage
      setUserStorage(STORAGE_KEY, JSON.stringify(Array.from(newIds)));

      // 🌟 优化：延迟同步到数据库（成就是极低频数据，不阻塞UI）
      if (session?.user?.id) {
        setUserStorage(SYNC_KEY, 'false');
        
        setTimeout(async () => {
          try {
            const response = await fetch('/api/achievements/unlock', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ achievementId, category }),
            });

            if (!response.ok) {
              const error = await response.json();
              console.error('[useAchievements] 保存到数据库失败:', error);
            } else {
              console.log('[useAchievements] ✅ 成就已同步到数据库:', achievementId);
              setUserStorage(SYNC_KEY, 'true');
              setUserStorage('achievementsSyncedAt', new Date().toISOString());
            }
          } catch (error) {
            console.error('[useAchievements] 同步异常:', error);
          }
        }, 800); // 延迟800ms，避免阻塞
      }

      return true; // 新解锁
    } catch (error) {
      console.error('[useAchievements] 解锁失败:', error);
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

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return true;
    }

    try {
      const ids = JSON.parse(stored) as string[];
      let successCount = 0;

      for (const id of ids) {
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

      console.log(`[useAchievements] 同步成功 ${successCount}/${ids.length} 个成就`);
      setUserStorage(SYNC_KEY, 'true');
      return true;
    } catch (error) {
      console.error('[useAchievements] 同步失败:', error);
      return false;
    }
  }, [session?.user?.id]);

  return {
    achievedIds,
    achievedCount, // 🔥 返回稳定的计数器而不是 Set.size
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

