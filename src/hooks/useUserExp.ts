import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { LevelManager } from '~/lib/LevelSystem';

const STORAGE_KEY = 'userExp';
const SYNC_KEY = 'userExpSynced';

/**
 * 用户经验管理 Hook
 * - 优先从数据库读取（跨设备同步）
 * - 缓存到 localStorage（快速访问）
 * - 修改时同时更新数据库和 localStorage
 */
export function useUserExp() {
  const { data: session, status } = useSession();
  const [userExp, setUserExp] = useState<number>(0);
  const [userLevel, setUserLevel] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 从数据库加载经验
  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/user/exp');
      if (response.ok) {
        const data = await response.json();
        const exp = data.userExp || 0;
        const level = data.userLevel || 1;
        
        // 更新状态和 localStorage
        setUserExp(exp);
        setUserLevel(level);
        localStorage.setItem(STORAGE_KEY, exp.toString());
        localStorage.setItem(SYNC_KEY, 'true');
        
        console.log('[useUserExp] 从数据库加载经验:', exp, '等级:', level);
      }
    } catch (error) {
      console.error('[useUserExp] 加载失败:', error);
      // 失败时使用 localStorage 的值
      const localExp = parseFloat(localStorage.getItem(STORAGE_KEY) || '0');
      if (localExp > 0) {
        setUserExp(localExp);
        const levelInfo = LevelManager.calculateLevel(localExp);
        setUserLevel(levelInfo.currentLevel);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // 初始化：优先从数据库加载
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated') {
      // 检查是否已同步
      const synced = localStorage.getItem(SYNC_KEY);
      
      if (!synced) {
        // 未同步：从数据库加载
        loadFromDatabase();
      } else {
        // 已同步：先用 localStorage 显示，然后后台同步
        const localExp = parseFloat(localStorage.getItem(STORAGE_KEY) || '0');
        if (localExp > 0) {
          setUserExp(localExp);
          const levelInfo = LevelManager.calculateLevel(localExp);
          setUserLevel(levelInfo.currentLevel);
        }
        setIsLoading(false);
        
        // 后台同步数据库（确保最新）
        loadFromDatabase();
      }
    } else {
      // 未登录：只使用 localStorage
      const localExp = parseFloat(localStorage.getItem(STORAGE_KEY) || '0');
      if (localExp > 0) {
        setUserExp(localExp);
        const levelInfo = LevelManager.calculateLevel(localExp);
        setUserLevel(levelInfo.currentLevel);
      }
      setIsLoading(false);
    }
  }, [status, loadFromDatabase]);

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
      
      // 立即更新 localStorage（用户体验优先）
      localStorage.setItem(STORAGE_KEY, newExp.toString());
      setUserExp(newExp);
      setUserLevel(levelInfo.currentLevel);

      // 如果已登录，同步到数据库
      if (session?.user?.id) {
        const response = await fetch('/api/user/exp/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userExp: newExp }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[useUserExp] 保存到数据库失败:', error);
          // 数据库保存失败，但 localStorage 已更新，仍然算成功
        } else {
          console.log('[useUserExp] 保存到数据库成功');
          localStorage.setItem(SYNC_KEY, 'true');
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

    const localExp = parseFloat(localStorage.getItem(STORAGE_KEY) || '0');
    if (localExp === 0) {
      // 没有本地数据，不需要同步
      return true;
    }

    try {
      const response = await fetch('/api/user/exp/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userExp: localExp }),
      });

      if (response.ok) {
        console.log('[useUserExp] 同步到数据库成功');
        localStorage.setItem(SYNC_KEY, 'true');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[useUserExp] 同步失败:', error);
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

