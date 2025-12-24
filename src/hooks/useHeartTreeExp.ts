import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { HeartTreeExpState } from '~/lib/HeartTreeExpSystem';
import { loadHeartTreeExpState, saveHeartTreeExpState, normalizeHeartTreeState } from '~/lib/HeartTreeExpSystem';

const STORAGE_KEY = 'heartTreeExpState';
const SYNC_KEY = 'heartTreeExpSynced';

/**
 * 心树经验管理 Hook
 * - 优先从数据库读取（跨设备同步）
 * - 缓存到 localStorage（快速访问）
 * - 修改时同时更新数据库和 localStorage
 */
export function useHeartTreeExp() {
  const { data: session, status } = useSession();
  const [expState, setExpState] = useState<HeartTreeExpState>(loadHeartTreeExpState());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 从数据库加载经验
  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/heart-tree/exp');
      if (response.ok) {
        const data = await response.json();
        const state: HeartTreeExpState = {
          level: data.level || 1,
          currentExp: data.currentExp || 0,
          totalExp: data.totalExp || 0,
          lastWateredDate: data.lastWateredDate,
          fertilizerBuff: data.fertilizerBuff,
        };
        
        // 规范化并更新状态
        const normalized = normalizeHeartTreeState(state);
        setExpState(normalized);
        saveHeartTreeExpState(normalized);
        localStorage.setItem(SYNC_KEY, 'true');
        
        console.log('[useHeartTreeExp] 从数据库加载经验:', normalized);
      }
    } catch (error) {
      console.error('[useHeartTreeExp] 加载失败:', error);
      // 失败时使用 localStorage 的值
      const localState = loadHeartTreeExpState();
      setExpState(localState);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // 初始化
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated') {
      const synced = localStorage.getItem(SYNC_KEY);
      
      if (!synced) {
        loadFromDatabase();
      } else {
        const localState = loadHeartTreeExpState();
        setExpState(localState);
        setIsLoading(false);
        loadFromDatabase(); // 后台同步
      }
    } else {
      const localState = loadHeartTreeExpState();
      setExpState(localState);
      setIsLoading(false);
    }
  }, [status, loadFromDatabase]);

  // 更新经验状态
  const updateExpState = useCallback(async (newState: HeartTreeExpState) => {
    setIsSaving(true);

    try {
      // 规范化状态
      const normalized = normalizeHeartTreeState(newState);
      
      // 立即更新 localStorage
      saveHeartTreeExpState(normalized);
      setExpState(normalized);

      // 如果已登录，同步到数据库
      if (session?.user?.id) {
        const response = await fetch('/api/heart-tree/exp/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: normalized.level,
            currentExp: normalized.currentExp,
            totalExp: normalized.totalExp,
            lastWateredDate: normalized.lastWateredDate,
            fertilizerBuff: normalized.fertilizerBuff,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[useHeartTreeExp] 保存到数据库失败:', error);
        } else {
          console.log('[useHeartTreeExp] 保存到数据库成功');
          localStorage.setItem(SYNC_KEY, 'true');
        }
      }

      return true;
    } catch (error) {
      console.error('[useHeartTreeExp] 更新失败:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [session?.user?.id]);

  // 手动同步到数据库
  const syncToDatabase = useCallback(async () => {
    if (!session?.user?.id) return false;

    const localState = loadHeartTreeExpState();
    if (localState.totalExp === 0) {
      return true;
    }

    try {
      const response = await fetch('/api/heart-tree/exp/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: localState.level,
          currentExp: localState.currentExp,
          totalExp: localState.totalExp,
          lastWateredDate: localState.lastWateredDate,
          fertilizerBuff: localState.fertilizerBuff,
        }),
      });

      if (response.ok) {
        console.log('[useHeartTreeExp] 同步到数据库成功');
        localStorage.setItem(SYNC_KEY, 'true');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[useHeartTreeExp] 同步失败:', error);
      return false;
    }
  }, [session?.user?.id]);

  return {
    expState,
    isLoading,
    isSaving,
    updateExpState,
    syncToDatabase,
    reload: loadFromDatabase,
  };
}














