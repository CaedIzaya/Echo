/**
 * 深度觉察引擎 - React Hook 集成
 * 用于在 React 组件中集成觉察引擎
 */

import { useEffect, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AwarenessContext } from './types';
import { getDialogueWithPriority, buildAwarenessContext, PriorityLevel } from './index';
import { DatabaseUser, DatabaseDayStats, DatabaseEvent } from './database-adapter';

/**
 * 使用觉察引擎的 Hook
 * 在组件中使用，自动检测并返回觉察文案
 */
export function useAwarenessDialogue() {
  const { data: session } = useSession();
  const [dialogue, setDialogue] = useState<{
    copy: string;
    source: 'LUMI' | 'HEART_TREE';
    metadata?: any;
  } | null>(null);

  const checkAwareness = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // 从 API 获取数据
      const [userData, todayStats, lastNDaysStats, recentEvents] = await Promise.all([
        fetch('/api/user/stats').then(r => r.json()),
        fetch('/api/stats/today').then(r => r.json()),
        fetch('/api/stats/last-days?days=5').then(r => r.json()),
        fetch('/api/events/recent?minutes=60').then(r => r.json()),
      ]);

      // 构建觉察上下文
      const ctx = await buildAwarenessContext(
        session.user.id,
        () => userData,
        () => todayStats,
        () => lastNDaysStats,
        () => recentEvents
      );

      // 检查觉察引擎
      const awarenessDialogue = getDialogueWithPriority(ctx);
      
      if (awarenessDialogue && awarenessDialogue.priority === PriorityLevel.AWARENESS) {
        setDialogue({
          copy: awarenessDialogue.copy,
          source: awarenessDialogue.source as 'LUMI' | 'HEART_TREE',
          metadata: awarenessDialogue.metadata,
        });
      } else {
        setDialogue(null);
      }
    } catch (error) {
      console.error('觉察引擎检查失败:', error);
    }
  }, [session]);

  useEffect(() => {
    checkAwareness();
  }, [checkAwareness]);

  return { dialogue, refresh: checkAwareness };
}

