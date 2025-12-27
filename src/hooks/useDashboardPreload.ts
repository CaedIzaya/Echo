/**
 * Dashboard 数据预加载 Hook
 * 
 * 优化策略：
 * 1. 只在首次登录时触发（使用sessionStorage标记）
 * 2. 只加载Dashboard必需的数据（统计、计划），心树等延迟加载
 * 3. 快速加载，避免用户等待
 * 4. 避免闪屏，提升用户体验
 */

import { useState, useEffect } from 'react';
import { DataLoader } from '~/lib/dataPriority';
import { userStorageJSON } from '~/lib/userStorage';

export interface PreloadedData {
  // 统计数据（Dashboard必需）
  todayMinutes: number;
  weeklyMinutes: number;
  totalMinutes: number;
  streakDays: number;
  
  // 用户计划（Dashboard必需）
  userPlans: any[];
  primaryPlan: any | null;
  
  // 用户基础信息（Dashboard必需）
  userExp: number;
  userLevel: number;
  
  // 加载状态
  isComplete: boolean;
  shouldPreload: boolean; // 是否需要预加载
  error: string | null;
}

interface PreloadProgress {
  total: number;
  loaded: number;
  currentTask: string;
}

export function useDashboardPreload(userId: string | undefined) {
  const [data, setData] = useState<PreloadedData>({
    todayMinutes: 0,
    weeklyMinutes: 0,
    totalMinutes: 0,
    streakDays: 0,
    userPlans: [],
    primaryPlan: null,
    userExp: 0,
    userLevel: 1,
    isComplete: false,
    shouldPreload: false,
    error: null,
  });
  
  const [progress, setProgress] = useState<PreloadProgress>({
    total: 3,
    loaded: 0,
    currentTask: '连接云端...',
  });

  useEffect(() => {
    if (!userId) {
      return;
    }

    // 🔥 关键优化：只在首次登录时预加载
    const hasPreloaded = sessionStorage.getItem(`dashboard_preloaded_${userId}`);
    if (hasPreloaded === 'true') {
      console.log('⚡ 已预加载过，直接显示Dashboard');
      setData(prev => ({ 
        ...prev, 
        isComplete: true, 
        shouldPreload: false 
      }));
      return;
    }

    // 标记需要预加载
    setData(prev => ({ ...prev, shouldPreload: true }));
    
    let isMounted = true;

    const preloadData = async () => {
      try {
        // 🔥 精简：只加载Dashboard必需的3项数据
        const tasks = [
          { name: '同步统计数据...', key: 'stats' },
          { name: '加载用户计划...', key: 'userPlans' },
          { name: '加载用户等级...', key: 'userExp' },
        ];

        setProgress({ total: tasks.length, loaded: 0, currentTask: tasks[0].name });

        // 🔥 精简加载：只加载Dashboard必需的3项数据，一次API调用搞定
        
        // 1. 统一加载统计数据（today, weekly, total, streak）
        setProgress(prev => ({ ...prev, loaded: 0, currentTask: tasks[0].name }));
        const { data: statsData } = await DataLoader.load<any>(
          'dashboardStats',
          async () => {
            try {
              const res = await fetch('/api/dashboard/stats');
              if (res.ok) {
                const json = await res.json();
                return {
                  todayMinutes: json.todayMinutes || 0,
                  weeklyMinutes: json.weeklyMinutes || 0,
                  totalMinutes: json.totalMinutes || 0,
                  streakDays: json.streakDays || 0,
                };
              }
            } catch (e) {
              console.warn('从数据库加载统计数据失败，使用缓存');
            }
            return null;
          },
          { todayMinutes: 0, weeklyMinutes: 0, totalMinutes: 0, streakDays: 0 }
        );
        
        if (isMounted) {
          setData(prev => ({ 
            ...prev, 
            todayMinutes: statsData?.todayMinutes || 0,
            weeklyMinutes: statsData?.weeklyMinutes || 0,
            totalMinutes: statsData?.totalMinutes || 0,
            streakDays: statsData?.streakDays || 0,
          }));
        }

        // 2. 加载用户计划
        setProgress(prev => ({ ...prev, loaded: 1, currentTask: tasks[1].name }));
        const { data: userPlansData } = await DataLoader.load<any[]>(
          'userPlans',
          async () => {
            try {
              const res = await fetch('/api/projects');
              if (res.ok) {
                const json = await res.json();
                return json.projects || [];
              }
            } catch (e) {
              console.warn('从数据库加载计划失败，使用缓存');
            }
            return null;
          },
          []
        );
        const primaryPlan = (userPlansData || []).find((p: any) => p.isPrimary) || null;
        if (isMounted) {
          setData(prev => ({ 
            ...prev, 
            userPlans: userPlansData || [],
            primaryPlan
          }));
        }

        // 3. 加载用户经验值（用于显示等级）
        setProgress(prev => ({ ...prev, loaded: 2, currentTask: tasks[2].name }));
        const { data: userExpData } = await DataLoader.load<number>(
          'userExp',
          async () => {
            try {
              const res = await fetch('/api/user/exp');
              if (res.ok) {
                const json = await res.json();
                return json.exp || 0;
              }
            } catch (e) {
              console.warn('从数据库加载用户经验失败，使用缓存');
            }
            return null;
          },
          0
        );
        const userLevel = calculateLevel(userExpData || 0);
        if (isMounted) {
          setData(prev => ({ 
            ...prev, 
            userExp: userExpData || 0,
            userLevel
          }));
        }

        // 全部加载完成
        setProgress({ total: tasks.length, loaded: tasks.length, currentTask: '准备完成...' });
        
        // 标记已预加载
        sessionStorage.setItem(`dashboard_preloaded_${userId}`, 'true');
        
        if (isMounted) {
          setData(prev => ({ ...prev, isComplete: true }));
        }
        
        console.log('✅ Dashboard预加载完成');

      } catch (error) {
        console.error('数据预加载失败:', error);
        if (isMounted) {
          setData(prev => ({ 
            ...prev, 
            isComplete: true,
            error: error instanceof Error ? error.message : '加载失败'
          }));
        }
      }
    };

    preloadData();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { data, progress };
}

// 简单的等级计算函数
function calculateLevel(exp: number): number {
  if (exp < 100) return 1;
  if (exp < 300) return 2;
  if (exp < 600) return 3;
  if (exp < 1000) return 4;
  return Math.floor(Math.sqrt(exp / 100)) + 1;
}

