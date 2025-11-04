import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
// 心树功能暂时屏蔽
// import HeartTreeComponent from './dashboard/HeartTree';
// import BottomNavigation from './dashboard/BottomNavigation';
// import { getAchievementManager } from './dashboard/AchievementSystem';
// import { HeartTreeManager } from './dashboard/HeartTreeSystem';

interface TodayStats {
  minutes: number;
  date: string;
}

interface WeeklyStats {
  totalMinutes: number;
  weekStart: string;
}

interface DashboardStats {
  yesterdayMinutes: number;
  streakDays: number;
  completedGoals: number;
}

interface FlowMetrics {
  totalFocusMinutes: number;
  averageSessionLength: number;
  longestSession: number;
  sessionCount: number;
  consistencyScore: number;
  averageRating: number;
  completionRate: number;
  interruptionRate: number;
  currentStreak: number;
  improvementTrend: number;
}

export default function HeartTreePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  // 心树功能暂时屏蔽 - 自动重定向到dashboard
  useEffect(() => {
    if (sessionStatus !== 'loading') {
      router.push('/dashboard');
    }
  }, [sessionStatus, router]);
  
  // 以下变量暂时屏蔽 - 心树功能
  /*
  const [userData, setUserData] = useState({
    flowIndex: 0,
    flowIndexIncrease: 0,
    streakDays: 0,
    weeklyLongestSession: 0,
    monthlyStreak: 0,
    weeklyNewAchievements: [] as string[],
    todaySessions: 0,
    completedMilestonesToday: 0,
    dailyGoalCompleted: false,
    newAchievementsToday: 0,
  });
  */

  // 心树功能暂时屏蔽 - 直接返回null，等待重定向
  return null;

  /* 以下代码暂时屏蔽 - 心树功能
  // 获取今日日期
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // 获取今日数据
  const getTodayStats = (): TodayStats => {
    if (typeof window === 'undefined') return { minutes: 0, date: '' };
    const today = getTodayDate();
    const todayStatsData = localStorage.getItem('todayStats');
    const allTodayStats = todayStatsData ? JSON.parse(todayStatsData) : {};
    return allTodayStats[today] || { minutes: 0, date: today };
  };

  // 获取本周数据
  const getWeeklyStats = (): WeeklyStats => {
    if (typeof window === 'undefined') return { totalMinutes: 0, weekStart: '' };
    const saved = localStorage.getItem('weeklyStats');
    if (saved) return JSON.parse(saved);
    
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    return { totalMinutes: 0, weekStart: weekStart.toISOString().split('T')[0] };
  };

  // 加载用户数据
  useEffect(() => {

    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (typeof window === 'undefined') return;

    // 加载统计数据
    const todayStats = getTodayStats();
    const weeklyStats = getWeeklyStats();
    const savedStats = localStorage.getItem('dashboardStats');
    const stats: DashboardStats = savedStats ? JSON.parse(savedStats) : {
      yesterdayMinutes: 0,
      streakDays: 0,
      completedGoals: 0
    };

    // 加载心流指标
    const flowData = localStorage.getItem('flowMetrics');
    const metrics: FlowMetrics = flowData ? JSON.parse(flowData) : {
      totalFocusMinutes: 0,
      averageSessionLength: 0,
      longestSession: 0,
      sessionCount: 0,
      consistencyScore: 0.5,
      averageRating: 2.0,
      completionRate: 0.7,
      interruptionRate: 0.2,
      currentStreak: 0,
      improvementTrend: 0.1
    };

    // 计算心流指数
    const normalize = (value: number, min: number, max: number): number => {
      return Math.min(Math.max((value - min) / (max - min), 0), 1);
    };

    const WEIGHTS = {
      averageRating: 0.15,
      completionRate: 0.15,
      interruptionRate: 0.10,
      averageSessionLength: 0.20,
      longestSession: 0.10,
      sessionCount: 0.10,
      consistencyScore: 0.10,
      currentStreak: 0.05,
      improvementTrend: 0.05
    };

    const normalized = {
      averageSessionLength: normalize(metrics.averageSessionLength, 15, 120),
      sessionCount: normalize(metrics.sessionCount, 0, 20),
      consistencyScore: Math.max(0, Math.min(metrics.consistencyScore, 1)),
      averageRating: normalize(metrics.averageRating, 1, 3),
      completionRate: Math.max(0, Math.min(metrics.completionRate, 1)),
      interruptionRate: 1 - normalize(metrics.interruptionRate, 0, 0.5),
      currentStreak: normalize(metrics.currentStreak, 0, 14),
      improvementTrend: normalize(metrics.improvementTrend + 0.5, 0, 1),
      longestSession: normalize(metrics.longestSession, 30, 180)
    };

    const qualityScore = 
      normalized.averageRating * WEIGHTS.averageRating +
      normalized.completionRate * WEIGHTS.completionRate +
      normalized.interruptionRate * WEIGHTS.interruptionRate;

    const durationScore = 
      normalized.averageSessionLength * WEIGHTS.averageSessionLength +
      normalized.longestSession * WEIGHTS.longestSession;

    const consistencyScore = 
      normalized.sessionCount * WEIGHTS.sessionCount +
      normalized.consistencyScore * WEIGHTS.consistencyScore +
      normalized.currentStreak * WEIGHTS.currentStreak +
      normalized.improvementTrend * WEIGHTS.improvementTrend;

    const flowIndex = Math.round((qualityScore + durationScore + consistencyScore) * 100);

    // 获取上上次的心流指数（用于计算增量）
    const lastFlowIndex = parseFloat(localStorage.getItem('lastFlowIndex') || '0');
    const flowIndexIncrease = Math.max(0, flowIndex - lastFlowIndex);
    localStorage.setItem('lastFlowIndex', flowIndex.toString());

    // 获取主要计划
    const savedPlans = localStorage.getItem('userPlans');
    const plans = savedPlans ? JSON.parse(savedPlans) : [];
    const primaryPlan = plans.find((p: any) => p.isPrimary);
    
    // 计算今日完成的小目标数量
    let completedMilestonesToday = 0;
    if (primaryPlan && primaryPlan.milestones) {
      const today = getTodayDate();
      const todayCompleted = localStorage.getItem(`milestonesCompleted_${today}`);
      if (todayCompleted) {
        completedMilestonesToday = parseInt(todayCompleted, 10);
      }
    }

    // 计算今日专注次数（从localStorage或会话记录）
    const todaySessions = parseInt(localStorage.getItem('todaySessions') || '0', 10);

    // 检查是否完成每日目标
    const dailyGoalMinutes = primaryPlan?.dailyGoalMinutes || 0;
    const dailyGoalCompleted = todayStats.minutes >= dailyGoalMinutes && dailyGoalMinutes > 0;

    // 获取本周新成就
    const achievementManager = getAchievementManager();
    const allAchievements = achievementManager.getAllAchievements();
    const unlockedAchievements = allAchievements.filter(a => 
      achievementManager.isAchievementUnlocked(a.id)
    );
    
    // 获取本周解锁的成就（简化版：获取最近解锁的成就）
    const weeklyNewAchievements: string[] = [];
    const lastAchievementCheck = localStorage.getItem('lastAchievementCheck');
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // 获取最近解锁的成就名称
    unlockedAchievements.slice(-5).forEach(achievement => {
      weeklyNewAchievements.push(achievement.name);
    });

    // 计算今日新解锁的成就数量
    const newAchievementsToday = parseInt(localStorage.getItem('newAchievementsToday') || '0', 10);

    // 计算本周最长专注时间（简化版：使用本周总时长）
    const weeklyLongestSession = metrics.longestSession || 0;

    // 计算本月连续天数（简化版：使用streakDays）
    const monthlyStreak = stats.streakDays;

    // 机会现在累积在localStorage中，不需要在这里计算
    // 直接传递给组件，组件会从localStorage读取

    setUserData({
      flowIndex,
      flowIndexIncrease,
      streakDays: stats.streakDays,
      weeklyLongestSession,
      monthlyStreak,
      weeklyNewAchievements,
      todaySessions,
      completedMilestonesToday: 0, // 不再使用这个参数
      dailyGoalCompleted,
      newAchievementsToday: 0 // 不再使用这个参数
    });

    setIsLoading(false);
  }, [sessionStatus, router]);

  // 加载状态
  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 未认证状态
  if (sessionStatus === 'unauthenticated' || !session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50">
      <HeartTreeComponent
        flowIndex={userData.flowIndex}
        flowIndexIncrease={userData.flowIndexIncrease}
        streakDays={userData.streakDays}
        weeklyLongestSession={userData.weeklyLongestSession}
        monthlyStreak={userData.monthlyStreak}
        weeklyNewAchievements={userData.weeklyNewAchievements}
        todaySessions={userData.todaySessions}
        completedMilestonesToday={userData.completedMilestonesToday}
        dailyGoalCompleted={userData.dailyGoalCompleted}
        newAchievementsToday={userData.newAchievementsToday}
      />
      <BottomNavigation active="heart-tree" />
    </div>
  );
  */
}

