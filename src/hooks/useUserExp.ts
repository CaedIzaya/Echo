import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { LevelManager } from '~/lib/LevelSystem';
import { setProtectionMarker } from '~/lib/DataIntegritySystem';
import { getUserStorage, setUserStorage } from '~/lib/userStorage';

const STORAGE_KEY = 'userExp';
const SYNC_KEY = 'userExpSynced';

function readLocalExp(): number {
  if (typeof window === 'undefined') return 0;
  const raw = getUserStorage(STORAGE_KEY);
  const parsed = raw ? parseFloat(raw) : 0;
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function getInitialExpState() {
  const localExp = readLocalExp();
  if (localExp > 0) {
    const levelInfo = LevelManager.calculateLevel(localExp);
    return { exp: localExp, level: levelInfo.currentLevel };
  }
  return { exp: 0, level: 1 };
}

/**
 * 用户经验管理 Hook
 * - 优先从数据库读取（跨设备同步）
 * - 缓存到 localStorage（快速访问）
 * - 修改时同时更新数据库和 localStorage
 */
export function useUserExp() {
  const { data: session, status } = useSession();
  const initialState = getInitialExpState();
  const [userExp, setUserExp] = useState<number>(initialState.exp);
  const [userLevel, setUserLevel] = useState<number>(initialState.level);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 从数据库加载经验
  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/user/exp');
      if (response.ok) {
        const data = await response.json();
        const dbExp = Number.isFinite(data.userExp) ? Math.max(data.userExp, 0) : 0;
        const localExp = readLocalExp();
        const useExp = Math.max(dbExp, localExp);
        const levelInfo = LevelManager.calculateLevel(useExp);
        
        console.log('[useUserExp] 数据对比', {
          数据库经验: dbExp,
          本地经验: localExp,
          采用经验值: useExp,
          使用数据源: localExp > dbExp ? 'localStorage (本地更高)' : 'database (数据库更高或相等)'
        });
        
        setUserExp(useExp);
        setUserLevel(levelInfo.currentLevel);
        setUserStorage(STORAGE_KEY, useExp.toString());
        
        // ✅ 如果用户localStorage的值大于数据库，说明数据库数据过期或同步失败
        if (localExp > dbExp) {
          console.warn('[useUserExp] ⚠️ 检测到数据不一致！用户localStorage经验值高于数据库');
          console.warn('[useUserExp] 🔧 使用localStorage数据并同步到数据库，防止经验值丢失');
          
          // 自动修复：同步到数据库
          setUserStorage(SYNC_KEY, 'false');
          const syncResponse = await fetch('/api/user/exp/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userExp: localExp }),
          });
          
          if (syncResponse.ok) {
            console.log('[useUserExp] ✅ 数据已修复并同步到数据库');
            setUserStorage(SYNC_KEY, 'true');
            setUserStorage('userExpSyncedAt', new Date().toISOString());
          } else {
            console.error('[useUserExp] ❌ 同步到数据库失败，但本地数据已保留');
          }
        } else {
          // 数据库的值 >= localStorage，使用数据库的值
          setUserStorage(SYNC_KEY, 'true');
          setUserStorage('userExpSyncedAt', new Date().toISOString());
          console.log('[useUserExp] ✅ 从数据库加载经验:', useExp, '等级:', levelInfo.currentLevel, '（用户:', session.user.id, '）');
        }
      }
    } catch (error) {
      console.error('[useUserExp] 加载失败，使用本地数据:', error);
      // 失败时使用 localStorage 的值
      const localExp = readLocalExp();
      if (localExp > 0) {
        setUserExp(localExp);
        const levelInfo = LevelManager.calculateLevel(localExp);
        setUserLevel(levelInfo.currentLevel);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // 初始化：数据库优先
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated' && session?.user?.id) {
      // 🔥 新策略：从数据库加载，确保用户隔离
      const synced = getUserStorage(SYNC_KEY);
      const lastSyncAt = getUserStorage('userExpSyncedAt');
      
      const needSync = !synced || !lastSyncAt || isExpDataStale(lastSyncAt);
      
      if (needSync) {
        console.log('[useUserExp] 📊 从数据库加载经验值（首次或超过1小时）');
        loadFromDatabase();
      } else {
        // 使用用户缓存
        const localExp = readLocalExp();
        if (localExp > 0) {
          setUserExp(localExp);
          const levelInfo = LevelManager.calculateLevel(localExp);
          setUserLevel(levelInfo.currentLevel);
        }
        setIsLoading(false);
        console.log('[useUserExp] ⚡ 使用用户缓存经验值');
      }
    } else {
      // 未登录：清空数据
      setUserExp(0);
      setUserLevel(1);
      setIsLoading(false);
    }
  }, [status, session?.user?.id, loadFromDatabase]);

  // 更新经验值
  const updateUserExp = useCallback(async (newExp: number) => {
    if (typeof newExp !== 'number' || newExp < 0) {
      console.warn('[useUserExp] 无效的经验值:', newExp);
      return false;
    }

    if (newExp > 10000000) {
      console.warn('[useUserExp] 经验值超出范围:', newExp);
      return false;
    }

    setIsSaving(true);

    try {
      // 计算等级
      const levelInfo = LevelManager.calculateLevel(newExp);
      
      // 1. 立即更新用户隔离的localStorage（用户体验优先）
      setUserStorage(STORAGE_KEY, newExp.toString());
      setUserStorage(SYNC_KEY, 'false');
      setUserExp(newExp);
      setUserLevel(levelInfo.currentLevel);
      
      // 设置经验值里程碑防护标记（每达到 100 EXP 设置一次）
      if (newExp >= 100 && Math.floor(newExp / 100) > Math.floor((newExp - 100) / 100)) {
        setProtectionMarker('exp_milestone');
      }

      // 2. 立即同步到数据库（不延迟）
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/user/exp/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userExp: newExp }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('[useUserExp] ❌ 保存到数据库失败:', error);
            // 数据库保存失败，但 localStorage 已更新，仍然算成功
          } else {
            console.log('[useUserExp] ✅ 经验值已同步到数据库');
            setUserStorage(SYNC_KEY, 'true');
            setUserStorage('userExpSyncedAt', new Date().toISOString());
          }
        } catch (error) {
          console.error('[useUserExp] ❌ 同步异常:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('[useUserExp] 更新失败:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [session?.user?.id]);

  // 增加经验值
  const addUserExp = useCallback(async (expToAdd: number) => {
    const newExp = userExp + expToAdd;
    return await updateUserExp(newExp);
  }, [userExp, updateUserExp]);

  // 手动同步到数据库（用于迁移旧数据）
  const syncToDatabase = useCallback(async () => {
    if (!session?.user?.id) return false;

    const localExp = readLocalExp();
    if (localExp === 0) {
      // 没有本地数据，不需要同步
      return true;
    }

    try {
      setUserStorage(SYNC_KEY, 'false');
      const response = await fetch('/api/user/exp/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userExp: localExp }),
      });

      if (response.ok) {
        console.log('[useUserExp] ✅ 同步到数据库成功');
        setUserStorage(SYNC_KEY, 'true');
        setUserStorage('userExpSyncedAt', new Date().toISOString());
        return true;
      }

      return false;
    } catch (error) {
      console.error('[useUserExp] ❌ 同步失败:', error);
      return false;
    }
  }, [session?.user?.id]);

  return {
    userExp,
    userLevel,
    isLoading,
    isSaving,
    updateUserExp,
    addUserExp,
    syncToDatabase,
    reload: loadFromDatabase,
  };
}

// 检查经验值数据是否过期（1小时）
function isExpDataStale(lastSyncAt: string): boolean {
  try {
    const lastSync = new Date(lastSyncAt);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    // 经验值数据超过1小时视为过期（低频数据）
    return hoursSinceSync > 1;
  } catch {
    return true;
  }
}

