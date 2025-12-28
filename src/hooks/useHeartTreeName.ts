import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getUserStorage, setUserStorage } from '~/lib/userStorage';

const STORAGE_KEY = 'heartTreeNameV1';
const SYNC_KEY = 'heartTreeNameSynced';

/**
 * 心树名字管理 Hook
 * - 优先从数据库读取（跨设备同步）
 * - 缓存到 localStorage（快速访问）
 * - 修改时同时更新数据库和 localStorage
 */
export function useHeartTreeName() {
  const { data: session, status } = useSession();
  const [treeName, setTreeName] = useState<string>('心树');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 从数据库加载心树名字（数据库优先）
  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/heart-tree/get-name');
      if (response.ok) {
        const data = await response.json();
        const name = data.heartTreeName || '心树';
        
        // 更新状态和用户隔离的localStorage
        setTreeName(name);
        setUserStorage(STORAGE_KEY, name);
        setUserStorage(SYNC_KEY, 'true');
        
        console.log('[useHeartTreeName] ✅ 从数据库加载心树名字:', name, '（用户:', session.user.id, '）');
      }
    } catch (error) {
      console.error('[useHeartTreeName] ❌ 加载失败:', error);
      // 失败时使用用户隔离的localStorage
      const localName = getUserStorage(STORAGE_KEY);
      if (localName) {
        setTreeName(localName);
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
      
      if (!synced) {
        // 未同步：从数据库加载
        loadFromDatabase();
      } else {
        // 已同步：先用用户缓存，然后后台同步
        const localName = getUserStorage(STORAGE_KEY);
        if (localName) {
          setTreeName(localName);
        }
        setIsLoading(false);
        
        // 后台同步数据库（确保最新）
        setTimeout(() => {
          loadFromDatabase();
        }, 3000);
      }
    } else {
      // 未登录：使用默认值
      setTreeName('心树');
      setIsLoading(false);
    }
  }, [status, session?.user?.id, loadFromDatabase]);

  // 更新心树名字
  const updateTreeName = useCallback(async (newName: string) => {
    if (!newName || newName.trim().length === 0) {
      console.warn('[useHeartTreeName] 名字不能为空');
      return false;
    }

    if (newName.length > 20) {
      console.warn('[useHeartTreeName] 名字不能超过20个字符');
      return false;
    }

    setIsSaving(true);

    try {
      // 1. 立即更新用户隔离的localStorage
      const trimmedName = newName.trim();
      setUserStorage(STORAGE_KEY, trimmedName);
      setTreeName(trimmedName);

      // 2. 如果已登录，立即同步到数据库
      if (session?.user?.id) {
        const response = await fetch('/api/heart-tree/update-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[useHeartTreeName] ❌ 保存到数据库失败:', error);
          // 数据库保存失败，但 localStorage 已更新，仍然算成功
        } else {
          console.log('[useHeartTreeName] ✅ 保存到数据库成功');
          setUserStorage(SYNC_KEY, 'true');
        }
      }

      return true;
    } catch (error) {
      console.error('[useHeartTreeName] ❌ 更新失败:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [session?.user?.id]);

  // 手动同步到数据库（用于迁移旧数据）
  const syncToDatabase = useCallback(async () => {
    if (!session?.user?.id) return false;

    const localName = getUserStorage(STORAGE_KEY);
    if (!localName || localName === '心树') {
      // 没有本地数据或使用默认名字，不需要同步
      return true;
    }

    try {
      const response = await fetch('/api/heart-tree/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: localName }),
      });

      if (response.ok) {
        console.log('[useHeartTreeName] ✅ 同步到数据库成功');
        setUserStorage(SYNC_KEY, 'true');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[useHeartTreeName] ❌ 同步失败:', error);
      return false;
    }
  }, [session?.user?.id]);

  return {
    treeName,
    isLoading,
    isSaving,
    updateTreeName,
    syncToDatabase,
    reload: loadFromDatabase,
  };
}















