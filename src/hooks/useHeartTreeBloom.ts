import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface BloomState {
  canBloom: boolean;
  canLevelBloom: boolean;
  canWeeklyBloom: boolean;
  reasons: string[];
  currentWeek: string;
}

interface BloomStatusState {
  shouldShowBloom: boolean;
  bloomType: 'level' | 'weekly' | null;
  lastBloomTime: string | null;
  heartTreeLevel: number;
}

/**
 * 心树开花Hook (V3 持久版)
 * 
 * 功能：
 * - 页面加载时从数据库读取状态，实现花朵持久保留
 * - 自动检查开花条件
 * - 管理 isBlooming 状态
 */
export function useHeartTreeBloom() {
  const { data: session } = useSession();
  const [isBlooming, setIsBlooming] = useState(false);
  const [bloomState, setBloomState] = useState<BloomState | null>(null);
  const [bloomStatus, setBloomStatus] = useState<BloomStatusState | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  /**
   * 检查开花条件
   */
  const checkBloom = useCallback(async () => {
    if (!session?.user?.id) return null;

    setIsChecking(true);
    try {
      const response = await fetch('/api/heart-tree/bloom/check', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setBloomState(data);
        console.log('[useHeartTreeBloom] 开花条件检查:', data);
        return data;
      }

      return null;
    } catch (error) {
      console.error('[useHeartTreeBloom] 检查失败:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [session?.user?.id]);

  /**
   * 触发开花记录
   */
  const triggerBloom = useCallback(async () => {
    if (!session?.user?.id) return false;

    try {
      const response = await fetch('/api/heart-tree/bloom/check', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.canBloom) {
          console.log('[useHeartTreeBloom] 🌸 开花记录成功:', data.reasons);
          setIsBlooming(true);
          
          // localStorage 仅用于性能优化，不作为显示依据
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem('lastBloomDate', today);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('[useHeartTreeBloom] 触发失败:', error);
      return false;
    }
  }, [session?.user?.id]);

  /**
   * 手动重置开花状态（仅供调试）
   */
  const stopBloom = useCallback(() => {
    setIsBlooming(false);
    localStorage.removeItem('lastBloomDate');
  }, []);

  /**
   * 核心：加载时决定是否显示花朵
   */
  useEffect(() => {
    if (!session?.user?.id) return;

    const initBloom = async () => {
      try {
        // 1. 优先查询数据库状态
        const res = await fetch('/api/heart-tree/bloom/status');
        if (res.ok) {
          const status: BloomStatusState = await res.json();
          setBloomStatus(status);

          if (status.shouldShowBloom) {
            // ✅ 只要在有效期内，就直接显示
            console.log('[useHeartTreeBloom] 从数据库恢复开花状态');
            setIsBlooming(true);
            return;
          }
        }

        // 2. 数据库无记录，检查是否满足新开花条件
        const state = await checkBloom();
        if (state?.canBloom) {
          // 延迟一点时间自动触发
          setTimeout(() => {
            triggerBloom();
          }, 1500);
        }
      } catch (error) {
        console.error('[useHeartTreeBloom] 初始化失败:', error);
      }
    };

    initBloom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]); // 🔥 checkBloom 和 triggerBloom 在函数内部调用

  return {
    isBlooming,
    bloomState,
    bloomStatus,
    isChecking,
    checkBloom,
    triggerBloom,
    stopBloom,
  };
}
