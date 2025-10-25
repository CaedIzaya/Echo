import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import ProgressRing from './ProgressRing';
import BottomNavigation from './BottomNavigation';

interface Project {
  id: string;
  name: string;
  icon: string;
  dailyGoalMinutes: number;
  milestones: Milestone[];
  isActive: boolean;
  isPrimary?: boolean;
}

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

interface DashboardStats {
  todayMinutes: number;
  todayGoal: number;
  weeklyMinutes: number;
  streakDays: number;
}

export default function Dashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  // 使用 useMemo 缓存 userId，避免因 session 对象引用变化而触发重新渲染
  const userId = useMemo(() => session?.user?.id, [session?.user?.id]);
  
  // 创建一个稳定的认证状态标识
  const authKey = useMemo(() => {
    if (sessionStatus === 'loading') return 'loading';
    if (sessionStatus === 'unauthenticated') return 'unauthenticated';
    if (sessionStatus === 'authenticated' && userId) return `authenticated_${userId}`;
    return 'unknown';
  }, [sessionStatus, userId]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [stats] = useState<DashboardStats>({
    todayMinutes: 0,
    todayGoal: 30,
    weeklyMinutes: 125,
    streakDays: 3
  });

  // 简化的认证检查 - 不加载任何数据
  useEffect(() => {
    console.log('🔍 useEffect 触发（简化版 - 无API调用）', { 
      authKey,
      sessionStatus,
      timestamp: new Date().toISOString()
    });

    if (authKey === 'loading') {
      console.log('⏳ Session 加载中，跳过');
      return;
    }

    if (authKey === 'unauthenticated') {
      console.log('❌ 未认证，重定向');
      window.location.href = '/auth/signin';
      return;
    }

    if (authKey.startsWith('authenticated_')) {
      console.log('✅ 用户已认证，显示主界面（无API调用）');
      setIsLoading(false);
    }
  }, [authKey]);

  // UI 辅助函数
  const getProgressColor = (progress: number): string => {
    if (progress < 0.33) return '#ef4444';
    if (progress < 1) return '#eab308';
    return '#22c55e';
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '早上';
    if (hour >= 12 && hour < 18) return '下午';
    return '晚上';
  };

  // 处理函数
  const handleStartFocus = () => {
    router.push('/focus');
  };

  // 加载状态
  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 未认证状态
  if (sessionStatus === 'unauthenticated' || !session) {
    return null;
  }

  // 计算进度
  const progress = stats.todayGoal > 0 ? stats.todayMinutes / stats.todayGoal : 0;
  const progressColor = getProgressColor(progress);
  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4 sm:p-6">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">数字静默</h1>
            <p className="text-gray-600 mt-1">
              {greeting}好，专注者
            </p>
          </div>
          
          <div className="relative">
            <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm hover:bg-blue-700 transition">
              {session.user?.name?.[0]?.toUpperCase() || session.user?.email?.[0]?.toUpperCase() || 'U'}
            </button>
          </div>
        </div>

        {/* 今日进度 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">今日进度</h2>
            <span className="text-sm text-gray-500">
              {stats.todayMinutes} / {stats.todayGoal} 分钟
            </span>
          </div>
          
          <div className="flex flex-col items-center">
            <ProgressRing 
              progress={progress}
              color={progressColor}
              size={120}
              strokeWidth={8}
            />
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(progress * 100)}%
              </p>
              <p className="text-sm text-gray-600 mt-1">已完成</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-sm text-gray-600">本周专注</p>
              <p className="text-lg font-bold text-gray-900">
                {Math.floor(stats.weeklyMinutes / 60)}h {stats.weeklyMinutes % 60}m
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">连续专注</p>
              <p className="text-lg font-bold text-gray-900">{stats.streakDays}天</p>
            </div>
          </div>
        </div>

        {/* 开始专注按钮 */}
        <div className="mb-6">
          <button
            onClick={handleStartFocus}
            className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-green-700 transition shadow-md"
          >
            🎯 开始专注
          </button>
        </div>

        {/* 简化版主要计划 */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">主要计划</h2>
          
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              专注模式已启用
            </h3>
            <p className="text-gray-600 mb-6">
              现在可以开始专注了！Projects 功能暂时禁用以解决性能问题。
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => router.push('/onboarding')}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-medium transition"
              >
                设置项目
              </button>
              <button 
                onClick={() => router.push('/focus')}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 font-medium transition"
              >
                直接开始专注
              </button>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation active="home" />
    </div>
  );
}