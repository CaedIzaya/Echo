import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import ProgressRing from './ProgressRing';
import BottomNavigation from './BottomNavigation';
import UserMenu from './UserMenu';
import PrimaryPlanCard from './PrimaryPlanCard';
import AchievementPanel from './AchievementPanel';
import QuickSearchGuide from './QuickSearchGuide';
import { getAchievementManager, AchievementManager } from './AchievementSystem';
import { LevelManager, UserLevel } from './LevelSystem';

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

// 分离的数据结构 - 今日数据和累计数据独立
interface TodayStats {
  minutes: number;
  date: string;  // 日期如 "2025-10-29"
}

interface WeeklyStats {
  totalMinutes: number;
  weekStart: string;  // 本周开始日期
}

interface DashboardStats {
  yesterdayMinutes: number;  // 昨日专注时长（用于显示）
  streakDays: number;
  completedGoals: number;
}

interface FlowMetrics {
  // 专注时长相关
  totalFocusMinutes: number;
  averageSessionLength: number;
  longestSession: number;
  
  // 专注频率相关
  sessionCount: number;
  consistencyScore: number;
  
  // 专注质量相关
  averageRating: number;
  completionRate: number;
  interruptionRate: number;
  
  // 持续成长相关
  currentStreak: number;
  improvementTrend: number;
}

interface FlowIndexResult {
  score: number;
  level: string;
  breakdown: {
    quality: number;
    duration: number;
    consistency: number;
  };
}

// 成就展开组件（默认展开）- 显示真实成就数据
function AchievementsSection() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 监听localStorage变化以自动刷新成就
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'achievedAchievements') {
        setRefreshKey(prev => prev + 1);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // 设置定时器定期刷新（每2秒）
    const interval = setInterval(() => {
      const manager = getAchievementManager();
      const currentAchievements = manager.getAllAchievements().filter(a => manager.isAchievementUnlocked(a.id));
      if (currentAchievements.length !== achievements.length) {
        setRefreshKey(prev => prev + 1);
      }
    }, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [achievements.length]);
  
  useEffect(() => {
    const manager = getAchievementManager();
    const allAchievements = manager.getAllAchievements();
    
    // 过滤出已解锁的成就，并按类别排序以获得更好的显示顺序
    const unlockedAchievements = allAchievements
      .filter(a => manager.isAchievementUnlocked(a.id))
      .sort((a, b) => {
        // 按类别优先级排序
        const order = { 'first': 0, 'flow': 1, 'time': 2, 'daily': 3, 'milestone': 4 };
        return (order[a.category] || 5) - (order[b.category] || 5);
      });
    
    setAchievements(unlockedAchievements);
  }, [refreshKey]);
  
  // 获取成就背景渐变色
  const getAchievementGradient = (category: string) => {
    switch(category) {
      case 'flow':
        return 'from-purple-400 to-pink-500';
      case 'time':
        return 'from-blue-400 to-cyan-500';
      case 'daily':
        return 'from-green-400 to-emerald-500';
      case 'milestone':
        return 'from-yellow-400 to-orange-500';
      case 'first':
        return 'from-indigo-400 to-purple-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };
  
  // 获取最近5个成就
  const recentAchievements = achievements.slice(0, 5);
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>🏆</span>
          最近成就
          {achievements.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({achievements.length}个已解锁)
            </span>
          )}
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          {isExpanded ? '收起 ▲' : '展开 ▼'}
        </button>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-64' : 'max-h-0'}`}>
        {recentAchievements.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-3 opacity-30">🏆</div>
            <p className="text-gray-500">完成一次专注，解锁你的第一个成就吧！</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`flex-shrink-0 w-32 bg-gradient-to-br ${getAchievementGradient(achievement.category)} rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}
                title={achievement.description}
              >
                <div className="text-4xl mb-2">{achievement.icon}</div>
                <p className="text-xs text-white font-semibold line-clamp-2">{achievement.name}</p>
              </div>
            ))}
            
            {/* 如果成就少于5个，显示待解锁卡片 */}
            {Array.from({ length: 5 - recentAchievements.length }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="flex-shrink-0 w-32 bg-gray-100 rounded-2xl p-4 text-center border-2 border-dashed border-gray-300 flex items-center justify-center"
              >
                <p className="text-xs text-gray-400">待解锁</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 计算周对比函数
function calculateWeeklyComparison(currentWeek: number, lastWeek: number) {
  if (lastWeek === 0 && currentWeek === 0) {
    return {
      type: 'same' as const,
      percentage: 0,
      description: '从零开始，专注当下'
    };
  }

  if (lastWeek === 0) {
    return {
      type: 'increase' as const,
      percentage: 100,
      description: '全新的开始！'
    };
  }

  const percentage = Math.round(((currentWeek - lastWeek) / lastWeek) * 100);
  
  let type: 'increase' | 'decrease' | 'same' = 'same';
  if (percentage > 5) type = 'increase';
  if (percentage < -5) type = 'decrease';

  const descriptions = {
    increase: percentage > 50 ? '爆发式成长！继续保持' :
               percentage > 20 ? '显著进步，为你骄傲' :
               '稳步提升，积少成多',
    decrease: percentage < -30 ? '调整节奏，重新出发' :
               percentage < -10 ? '小小波动，无需担心' :
               '休息是为了走更远的路',
    same: '保持稳定，专注当下'
  };

  return {
    type,
    percentage: Math.abs(percentage),
    description: descriptions[type]
  };
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
  
  // 获取今日日期的工具函数
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  
  // 获取今日数据的工具函数
  const getTodayStats = (): TodayStats => {
    if (typeof window === 'undefined') return { minutes: 0, date: '' };
    const today = getTodayDate();
    const todayStatsData = localStorage.getItem('todayStats');
    const allTodayStats = todayStatsData ? JSON.parse(todayStatsData) : {};
    return allTodayStats[today] || { minutes: 0, date: today };
  };
  
  // 获取本周数据的工具函数
  const getWeeklyStats = (): WeeklyStats => {
    if (typeof window === 'undefined') return { totalMinutes: 0, weekStart: '' };
    const saved = localStorage.getItem('weeklyStats');
    if (saved) return JSON.parse(saved);
    
    // 计算本周开始日期（周一）
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一
    const weekStart = new Date(now.setDate(diff));
    return { totalMinutes: 0, weekStart: weekStart.toISOString().split('T')[0] };
  };
  
  // 保存今日数据
  const saveTodayStats = (minutes: number) => {
    if (typeof window === 'undefined') return;
    const today = getTodayDate();
    const todayStatsData = localStorage.getItem('todayStats');
    const allTodayStats = todayStatsData ? JSON.parse(todayStatsData) : {};
    allTodayStats[today] = { minutes, date: today };
    localStorage.setItem('todayStats', JSON.stringify(allTodayStats));
  };
  
  // 保存本周数据
  const saveWeeklyStats = (totalMinutes: number, weekStart: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('weeklyStats', JSON.stringify({ totalMinutes, weekStart }));
  };
  
  // 今日数据状态
  const [todayStats, setTodayStats] = useState<TodayStats>(() => getTodayStats());
  
  // 本周数据状态
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>(() => getWeeklyStats());
  
  // 从localStorage加载统计数据（其他数据）
  const [stats, setStats] = useState<DashboardStats>(() => {
    if (typeof window !== 'undefined') {
      const savedStats = localStorage.getItem('dashboardStats');
      return savedStats ? JSON.parse(savedStats) : {
        yesterdayMinutes: 0,
        streakDays: 0,
        completedGoals: 0
      };
    }
    return {
      yesterdayMinutes: 0,
      streakDays: 0,
      completedGoals: 0
    };
  });

  // 主要计划状态 - 从localStorage加载
  const [primaryPlan, setPrimaryPlan] = useState<Project | null>(() => {
    if (typeof window !== 'undefined') {
      const savedPlans = localStorage.getItem('userPlans');
      const plans = savedPlans ? JSON.parse(savedPlans) : [];
      return plans.find((p: Project) => p.isPrimary) || null;
    }
    return null;
  });

  // 成就系统相关 - 必须在所有条件返回之前声明
  const [achievementManager, setAchievementManager] = useState<AchievementManager | null>(null);
  const [showAchievementPanel, setShowAchievementPanel] = useState(false);
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [unviewedAchievements, setUnviewedAchievements] = useState<any[]>([]);
  const [showQuickSearchGuide, setShowQuickSearchGuide] = useState(false);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [isFlowIndexExpanded, setIsFlowIndexExpanded] = useState(false);

  // 更新统计数据
  const updateStats = (newStats: Partial<DashboardStats>) => {
    setStats(prev => {
      const updated = { ...prev, ...newStats };
      if (typeof window !== 'undefined') {
        localStorage.setItem('dashboardStats', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // 增加完成的小目标计数
  const incrementCompletedGoals = (count: number) => {
    updateStats({
      completedGoals: stats.completedGoals + count
    });
  };

  // 切换小目标状态 - 设置为已完成（支持多个ID）
  const handleMilestoneToggle = (milestoneId: string) => {
    setPrimaryPlan(prev => {
      if (!prev) return prev;
      
      const updatedMilestones = prev.milestones.map(m =>
        m.id === milestoneId ? { ...m, isCompleted: true } : m
      );

      const updatedPlan = {
        ...prev,
        milestones: updatedMilestones
      };

      // 同步到localStorage
      if (typeof window !== 'undefined') {
        const savedPlans = localStorage.getItem('userPlans');
        const plans = savedPlans ? JSON.parse(savedPlans) : [];
        const updatedPlans = plans.map((p: Project) => 
          p.id === updatedPlan.id ? updatedPlan : p
        );
        localStorage.setItem('userPlans', JSON.stringify(updatedPlans));
      }

      // 小目标完成获得经验值
      if (typeof window !== 'undefined') {
        const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
        const milestoneExp = LevelManager.calculateMilestoneExp(); // 5 EXP
        const newExp = currentExp + milestoneExp;
        localStorage.setItem('userExp', newExp.toString());
        
        const oldLevel = LevelManager.calculateLevel(currentExp);
        const newLevel = LevelManager.calculateLevel(newExp);
        setUserLevel(newLevel);
        
        if (newLevel.currentLevel > oldLevel.currentLevel) {
          console.log('🎉 等级提升！（完成小目标触发）', newLevel);
        }
      }

      return updatedPlan;
    });
  };

  // 批量完成多个小目标
  const handleBulkMilestoneToggle = (milestoneIds: string[]) => {
    setPrimaryPlan(prev => {
      if (!prev) return prev;
      
      const updatedMilestones = prev.milestones.map(m =>
        milestoneIds.includes(m.id) ? { ...m, isCompleted: true } : m
      );

      const updatedPlan = {
        ...prev,
        milestones: updatedMilestones
      };

      // 同步到localStorage
      if (typeof window !== 'undefined') {
        const savedPlans = localStorage.getItem('userPlans');
        const plans = savedPlans ? JSON.parse(savedPlans) : [];
        const updatedPlans = plans.map((p: Project) => 
          p.id === updatedPlan.id ? updatedPlan : p
        );
        localStorage.setItem('userPlans', JSON.stringify(updatedPlans));
      }

      // 批量完成小目标获得经验值
      if (typeof window !== 'undefined') {
        const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
        const milestoneExp = LevelManager.calculateMilestoneExp(); // 每个5 EXP
        const totalExp = currentExp + (milestoneExp * milestoneIds.length);
        localStorage.setItem('userExp', totalExp.toString());
        
        const oldLevel = LevelManager.calculateLevel(currentExp);
        const newLevel = LevelManager.calculateLevel(totalExp);
        setUserLevel(newLevel);
        
        if (newLevel.currentLevel > oldLevel.currentLevel) {
          console.log('🎉 等级提升！（批量完成小目标触发）', newLevel);
        }
      }

      return updatedPlan;
    });
  };

  // 更新心流指标
  const updateFlowMetrics = (sessionMinutes: number, rating?: number) => {
    const flowData = localStorage.getItem('flowMetrics');
    let metrics: FlowMetrics = flowData ? JSON.parse(flowData) : {
      totalFocusMinutes: 0,
      averageSessionLength: 0,
      longestSession: 0,
      sessionCount: 0,
      consistencyScore: 0.5,
      averageRating: 2.0,
      completionRate: 0.7,
      interruptionRate: 0.2,
      currentStreak: 0,
      improvementTrend: 0
    };

    // 更新基本指标
    metrics.totalFocusMinutes += sessionMinutes;
    metrics.sessionCount += 1;
    metrics.longestSession = Math.max(metrics.longestSession, sessionMinutes);
    metrics.averageSessionLength = metrics.totalFocusMinutes / metrics.sessionCount;
    
    // 更新评分
    if (rating) {
      metrics.averageRating = ((metrics.averageRating * (metrics.sessionCount - 1)) + rating) / metrics.sessionCount;
    }

    // 计算一致性（基于最近7天的专注频率）
    const recentSessions = metrics.sessionCount;
    metrics.consistencyScore = Math.min(recentSessions / 14, 1); // 假设每天2次为满分

    // 保存更新后的指标
    localStorage.setItem('flowMetrics', JSON.stringify(metrics));
  };

  // 专注完成后更新统计数据（由focus页面调用）
  const handleFocusSessionComplete = (minutes: number, rating?: number, completed: boolean = true) => {
    const status = completed ? '✅ 完成' : '⚠️ 中断';
    console.log('📈 Dashboard收到专注报告', { 
      status,
      minutes, 
      rating
    });
    
    const today = getTodayDate();
    const lastFocusDate = localStorage.getItem('lastFocusDate');
    const isNewDay = lastFocusDate !== today;

    // 处理新的一天：归档昨日数据并重置今日数据
    if (isNewDay) {
      // 归档昨日数据
      const yesterdayDate = lastFocusDate || today;
      const yesterdayStatsData = localStorage.getItem('todayStats');
      const allTodayStats = yesterdayStatsData ? JSON.parse(yesterdayStatsData) : {};
      const yesterdayMinutes = allTodayStats[yesterdayDate]?.minutes || 0;
      
      console.log('📅 新的一天开始！', {
        yesterdayDate,
        yesterdayMinutes,
        today
      });
      
      // 更新昨日数据到主统计数据
      updateStats({ yesterdayMinutes });
      
      // 更新连续天数
      const newStreakDays = stats.streakDays + (yesterdayMinutes > 0 ? 1 : 0);
      updateStats({ streakDays: newStreakDays });
      
      // 保存今日日期标记
      localStorage.setItem('lastFocusDate', today);
      
      // 重置今日数据（从0开始）
      saveTodayStats(0);
      setTodayStats({ minutes: 0, date: today });
      
      console.log('🔄 日期已更新', { today, newStreakDays });
    }
    
    // 更新今日数据
    const newTodayMinutes = todayStats.minutes + minutes;
    saveTodayStats(newTodayMinutes);
    setTodayStats(prev => ({ ...prev, minutes: newTodayMinutes }));
    
    // 更新本周数据（独立于今日数据，不受重置影响）
    const currentWeeklyTotal = weeklyStats.totalMinutes;
    const newWeeklyMinutes = currentWeeklyTotal + minutes;
    saveWeeklyStats(newWeeklyMinutes, weeklyStats.weekStart);
    setWeeklyStats(prev => ({ ...prev, totalMinutes: newWeeklyMinutes }));
    
    console.log('📊 数据已更新', {
      today: { minutes: newTodayMinutes },
      week: { totalMinutes: newWeeklyMinutes }
    });

    // 更新心流指标（仅完成时更新质量相关指标）
    if (completed && rating) {
      updateFlowMetrics(minutes, rating);
    } else {
      // 中断时只更新时长统计
      updateFlowMetrics(minutes);
    }

    // 更新等级经验值
    updateUserExp(minutes, rating, completed);
    
    console.log('✅ 统计数据已更新完成');
  };

  // 更新用户经验值
  const updateUserExp = (minutes: number, rating?: number, completed: boolean = true) => {
    const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
    
    // 计算此次专注获得的经验值
    const sessionExp = LevelManager.calculateSessionExp(minutes, rating, stats.streakDays);
    
    const newTotalExp = currentExp + sessionExp;
    const oldLevel = LevelManager.calculateLevel(currentExp);
    const newLevel = LevelManager.calculateLevel(newTotalExp);
    
    // 保存经验值
    localStorage.setItem('userExp', newTotalExp.toString());
    
    // 检测等级提升
    if (newLevel.currentLevel > oldLevel.currentLevel) {
      console.log('🎉 等级提升！', {
        oldLevel: oldLevel.currentLevel,
        newLevel: newLevel.currentLevel,
        newTitle: newLevel.title
      });
      // 可以在这里触发升级动画或通知
      setUserLevel(newLevel);
    } else {
      setUserLevel(newLevel);
    }
    
    console.log('📈 经验值更新', { 
      gained: sessionExp, 
      total: newTotalExp, 
      level: newLevel.currentLevel 
    });
  };

  // 暴露给focus页面使用的函数
  if (typeof window !== 'undefined') {
    (window as any).reportFocusSessionComplete = handleFocusSessionComplete;
  }

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

  // 计算心流指数（需要在早期计算以确保 useEffect 可以使用）
  const flowIndex = useMemo(() => {
    // 安全检查：确保只在客户端执行
    if (typeof window === 'undefined') {
      return {
        score: 0,
        level: '初识心流',
        breakdown: {
          quality: 0,
          duration: 0,
          consistency: 0
        }
      };
    }

    const flowData = localStorage.getItem('flowMetrics');
    const metrics: FlowMetrics = flowData 
      ? JSON.parse(flowData)
      : {
          totalFocusMinutes: weeklyStats.totalMinutes,
          averageSessionLength: 30,
          longestSession: 60,
          sessionCount: Math.floor(weeklyStats.totalMinutes / 30),
          consistencyScore: 0.5,
          averageRating: 2.0,
          completionRate: 0.7,
          interruptionRate: 0.2,
          currentStreak: stats.streakDays,
          improvementTrend: 0.1
        };

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

    const totalScore = (qualityScore + durationScore + consistencyScore) * 100;

    const getFlowLevel = (score: number): string => {
      if (score >= 85) return '深度心流';
      if (score >= 70) return '稳定心流';
      if (score >= 55) return '成长心流';
      if (score >= 40) return '探索心流';
      return '初识心流';
    };

    return {
      score: Math.round(totalScore),
      level: getFlowLevel(totalScore),
      breakdown: {
        quality: Math.round(qualityScore * 100),
        duration: Math.round(durationScore * 100),
        consistency: Math.round(consistencyScore * 100)
      }
    };
  }, [weeklyStats.totalMinutes, stats.streakDays]);

  // 初始化成就管理器
  useEffect(() => {
    const manager = getAchievementManager();
    setAchievementManager(manager);
    
    // 检查当前状态的成就
    const flowAchievements = manager.checkFlowIndexAchievements(flowIndex.score);
    
    // 检查总时长成就（小时）- 使用本周累计
    const totalHours = Math.floor(weeklyStats.totalMinutes / 60);
    const timeAchievements = manager.checkTotalTimeAchievements(totalHours);
    
    // 检查今日时长成就
    const todayHours = todayStats.minutes / 60;
    const dailyAchievements = manager.checkDailyTimeAchievements(todayHours);
    
    // 检查小目标成就
    const milestoneAchievements = manager.checkMilestoneAchievements(stats.completedGoals);
    
    // 检查第一次完成专注成就
    const firstFocusAchievement = todayStats.minutes > 0 
      ? manager.checkFirstTimeAchievements('focus')
      : [];
    
    const allNew = [
      ...flowAchievements, 
      ...timeAchievements, 
      ...dailyAchievements, 
      ...milestoneAchievements,
      ...firstFocusAchievement
    ];
    
    if (allNew.length > 0) {
      setNewAchievements(allNew);
      // 添加到未查看列表
      setUnviewedAchievements(allNew);
      
      // 保存未查看成就到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('unviewedAchievements', JSON.stringify(allNew));
      }
      
      // 成就解锁获得经验值（每个成就20 EXP）
      if (typeof window !== 'undefined') {
        const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
        const achievementExp = LevelManager.calculateAchievementExp('common'); // 基础成就20 EXP
        const totalExp = currentExp + (achievementExp * allNew.length);
        localStorage.setItem('userExp', totalExp.toString());
        
        const oldLevel = LevelManager.calculateLevel(currentExp);
        const newLevel = LevelManager.calculateLevel(totalExp);
        setUserLevel(newLevel);
        
        console.log(`🎁 解锁${allNew.length}个成就，获得${achievementExp * allNew.length} EXP`);
        
        if (newLevel.currentLevel > oldLevel.currentLevel) {
          console.log('🎉 等级提升！（成就解锁触发）', newLevel);
        }
      }
      
      // 3秒后自动隐藏弹窗（但不清除未查看标记）
      setTimeout(() => setNewAchievements([]), 3000);
    }
  }, [flowIndex.score, weeklyStats.totalMinutes, todayStats.minutes, stats.completedGoals]);
  
  // 从localStorage加载未查看的成就
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('unviewedAchievements');
      if (saved) {
        try {
          const unviewed = JSON.parse(saved);
          if (unviewed.length > 0) {
            setUnviewedAchievements(unviewed);
          }
        } catch (e) {
          console.error('加载未查看成就失败:', e);
        }
      }
    }
  }, []);

  // 加载和计算用户等级
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const userExp = parseFloat(localStorage.getItem('userExp') || '0');
    const levelInfo = LevelManager.calculateLevel(userExp);
    setUserLevel(levelInfo);
    
    console.log('📊 用户等级信息', levelInfo);
  }, [todayStats.minutes, weeklyStats.totalMinutes, stats.streakDays]);

  // UI 辅助函数 - 红绿灯机制
  const getProgressColor = (progress: number): string => {
    if (progress < 0.33) return '#ef4444'; // 红色 - 未完成
    if (progress < 1) return '#eab308';    // 黄色 - 部分完成
    return '#22c55e';                      // 绿色 - 完成
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '早上好';
    if (hour >= 12 && hour < 18) return '下午好';
    return '晚上好';
  };
  
  // 获取用户名 - 添加 session 存在性检查
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || '小伙伴';

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

  // 计算进度 - 今日完成目标百分比 = 已专注时间/每日目标
  const todayGoal = primaryPlan?.dailyGoalMinutes || 0;
  // 使用primaryPlan的dailyGoalMinutes作为今天的goal
  const progress = todayGoal > 0 ? Math.min(1, todayStats.minutes / todayGoal) : 0;
  const progressColor = getProgressColor(progress);
  const greeting = getGreeting();

  // 成就通知组件
  const AchievementNotification = () => {
    if (newAchievements.length === 0) return null;

    return (
      <div className="fixed top-4 right-4 z-50 space-y-2 animate-slide-in">
        {newAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className="bg-white rounded-2xl shadow-2xl p-4 border-2 border-teal-400 animate-bounce"
            style={{ maxWidth: '300px' }}
          >
            <div className="flex items-center gap-3">
              <div className="text-4xl">{achievement.icon}</div>
              <div className="flex-1">
                <div className="font-bold text-gray-900">{achievement.name}</div>
                <div className="text-sm text-gray-600">{achievement.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-20">
      {/* 成就通知 */}
      <AchievementNotification />
      
      <div className="p-6 sm:p-8 pt-20">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting}，{userName}
            </h1>
            <p className="text-gray-500 mt-1">
              {progress >= 1 ? '恭喜你，我们将铭记今天所夺回的时光' : '准备好夺回今天的时间了吗？'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 搜索指南按钮 */}
            <button
              onClick={() => setShowQuickSearchGuide(true)}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
              title="快速查找指南"
            >
              <span className="text-2xl">🔍</span>
            </button>

            {/* 成就按钮 */}
            <button
              onClick={() => setShowAchievementPanel(true)}
              className="relative w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
            >
              <span className="text-2xl">🏆</span>
              {/* 显示未查看的成就数量 */}
              {unviewedAchievements.length > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-xs text-white font-bold">
                    {unviewedAchievements.length}
                  </span>
                </div>
              )}
            </button>
            
            <UserMenu 
              userInitial={session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'}
            />
          </div>
        </div>

        {/* 主数据区域 - 带动态边框 */}
        <div className="relative mb-8 bg-white/50 backdrop-blur-sm rounded-3xl p-6 shadow-lg border-4 border-teal-500/30 animate-pulse-border">
          {/* 动态边框动画 */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-teal-400/50 via-transparent to-cyan-400/50 animate-gradient-x"></div>
          
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* 左侧 - 艺术版环形进度图（更大） */}
            <div className="flex-shrink-0">
              <div className="relative">
                {/* 进度环 - 使用红绿灯机制 */}
                <ProgressRing 
                  progress={progress}
                  color={progressColor}
                  size={240}
                  strokeWidth={12}
                />
                
                {/* 中心内容 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-6xl font-bold text-gray-900 mb-1">
                      {Math.round(progress * 100)}%
                    </p>
                    <p className="text-sm text-gray-500">今日完成</p>
                  </div>
                </div>
                
                {/* 动态花朵装饰 */}
                <div className="absolute -top-2 -right-2 text-4xl animate-bounce" style={{ animationDuration: '2s' }}>
                  🌸
                </div>
                <div className="absolute -bottom-2 -left-2 text-3xl animate-pulse" style={{ animationDuration: '1.5s' }}>
                  ✨
                </div>
                <div className="absolute -top-2 -left-2 text-3xl animate-bounce" style={{ animationDuration: '3s' }}>
                  🌼
                </div>
                <div className="absolute -bottom-2 -right-2 text-4xl animate-pulse">
                  🌺
                </div>
              </div>
            </div>

            {/* 右侧 - 统计卡片单列（紧凑） */}
            <div className="flex-1 flex flex-col gap-3 w-full lg:w-auto">
              {/* 用户等级 - 第一个 */}
              {userLevel && (
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-3 shadow-sm hover:shadow-md transition-all text-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⭐</span>
                      <p className="text-xs text-white/90">等级</p>
                    </div>
                    <p className="text-xl font-bold">LV.{userLevel.currentLevel}</p>
                  </div>
                  <p className="text-xs text-white/80 mb-1">{userLevel.title}</p>
                  {/* 经验值进度条 */}
                  <div className="w-full bg-white/20 rounded-full h-1.5">
                    <div 
                      className="bg-white h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${userLevel.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/70 mt-1">
                    {userLevel.currentExp} / {userLevel.nextLevelExp} EXP
                  </p>
                </div>
              )}

              {/* 连续天数 - 第二个 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔥</span>
                    <p className="text-xs text-gray-500">连续专注</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{stats.streakDays}天</p>
                </div>
              </div>

              {/* 本周专注 - 第三个 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📈</span>
                    <p className="text-xs text-gray-500">本周专注</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {Math.floor(weeklyStats.totalMinutes / 60)}h{weeklyStats.totalMinutes % 60}m
                  </p>
                </div>
              </div>

              {/* 小目标完成 - 第四个 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <p className="text-xs text-gray-500">小目标完成</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{stats.completedGoals}个</p>
                </div>
              </div>

              {/* 心流指数 - 第五个 */}
              <div 
                className="bg-gradient-to-br from-purple-50 to-pink-50 backdrop-blur-sm rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-purple-100 cursor-pointer"
                onClick={() => setIsFlowIndexExpanded(!isFlowIndexExpanded)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌟</span>
                    <p className="text-xs font-medium text-gray-700">心流指数</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">{flowIndex.score}</p>
                    <p className="text-xs text-gray-500">{flowIndex.level}</p>
                  </div>
                </div>
                
                {/* 分解指标 - 可展开/收起 */}
                <div className={`overflow-hidden transition-all duration-300 ${
                  isFlowIndexExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="space-y-1.5 mt-2 pt-2 border-t border-purple-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">专注质量</span>
                      <span className="font-medium text-purple-700">{flowIndex.breakdown.quality}%</span>
                    </div>
                    <div className="w-full bg-purple-100 rounded-full h-1">
                      <div 
                        className="bg-purple-500 h-1 rounded-full transition-all"
                        style={{ width: `${flowIndex.breakdown.quality}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">专注时长</span>
                      <span className="font-medium text-cyan-700">{flowIndex.breakdown.duration}%</span>
                    </div>
                    <div className="w-full bg-cyan-100 rounded-full h-1">
                      <div 
                        className="bg-cyan-500 h-1 rounded-full transition-all"
                        style={{ width: `${flowIndex.breakdown.duration}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">专注习惯</span>
                      <span className="font-medium text-teal-700">{flowIndex.breakdown.consistency}%</span>
                    </div>
                    <div className="w-full bg-teal-100 rounded-full h-1">
                      <div 
                        className="bg-teal-500 h-1 rounded-full transition-all"
                        style={{ width: `${flowIndex.breakdown.consistency}%` }}
                      />
                    </div>
                  </div>

                  {/* 个性化提示 */}
                  <div className="mt-2 pt-2 border-t border-purple-100">
                    <p className="text-xs text-gray-600 italic">
                      {flowIndex.score < 40 && '💡 建议：从每天15分钟开始，建立专注习惯'}
                      {flowIndex.score >= 40 && flowIndex.score < 55 && '🚀 很好！尝试延长单次专注时间'}
                      {flowIndex.score >= 55 && flowIndex.score < 70 && '🎯 优秀！保持节奏，提高专注质量'}
                      {flowIndex.score >= 70 && flowIndex.score < 85 && '🌟 太棒了！你已形成稳定的心流状态'}
                      {flowIndex.score >= 85 && '🔥 大师级！你在深度心流中创造价值'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* CSS for animated gradient */}
          <style jsx>{`
            @keyframes gradient-x {
              0%, 100% {
                background-position: 0% 50%;
              }
              50% {
                background-position: 100% 50%;
              }
            }
            .animate-gradient-x {
              background-size: 200% auto;
              animation: gradient-x 3s ease infinite;
            }
            @keyframes slide-in {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            .animate-slide-in {
              animation: slide-in 0.5s ease-out;
            }
          `}</style>
        </div>

        {/* 固定位置 - 开始专注按钮 */}
        <div className="fixed bottom-28 right-8 z-10">
          <button
            onClick={handleStartFocus}
            className="bg-teal-500 text-white py-6 px-12 rounded-full font-semibold text-lg hover:bg-teal-600 transition shadow-lg hover:shadow-xl flex items-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            开始专注
          </button>
        </div>

        {/* 最近成就 - 可展开（默认展开） */}
        <AchievementsSection />

        {/* 计划区域 */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">主要计划</h2>
          
          <PrimaryPlanCard 
            plan={primaryPlan}
            onMilestoneToggle={handleMilestoneToggle}
            onBulkMilestoneToggle={handleBulkMilestoneToggle}
            onGoalCountIncrement={incrementCompletedGoals}
          />
        </div>
      </div>

      <BottomNavigation active="home" />
      
      {/* 成就面板 */}
      {showAchievementPanel && (
        <AchievementPanel 
          onClose={() => {
            // 关闭面板时清除未查看标记
            setUnviewedAchievements([]);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('unviewedAchievements');
            }
            setShowAchievementPanel(false);
          }} 
        />
      )}
      
      {/* 快速查找指南 */}
      {showQuickSearchGuide && (
        <QuickSearchGuide onClose={() => setShowQuickSearchGuide(false)} />
      )}
    </div>
  );
}