import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProgressRing from './ProgressRing';
import BottomNavigation from './BottomNavigation';
import UserMenu from './UserMenu';
import PrimaryPlanCard from './PrimaryPlanCard';
import AchievementPanel from './AchievementPanel';
import MailPanel from './MailPanel';
import TodaySummaryCard from './TodaySummaryCard';
import QuickSearchGuide from './QuickSearchGuide';
import SecurityGuideCard from './SecurityGuideCard';
import EchoSpirit from './EchoSpirit';
import EchoSpiritMobile from './EchoSpiritMobile';
import SpiritDialog, { SpiritDialogRef } from './SpiritDialog';
import StartupMotivation from './StartupMotivation';
import ShopModal from '~/components/shop/ShopModal';
import CalendarCard from '~/components/calendar/CalendarCard';
import GoalInputModal from '~/components/goals/GoalInputModal';
import { getCurrentTheme, getThemeConfig } from '~/lib/themeSystem';
import { getAchievementManager, AchievementManager } from '~/lib/AchievementSystem';
import type { Achievement } from '~/lib/AchievementSystem';
import { useMailSystem, MailSystem } from '~/lib/MailSystem';
import { LevelManager, UserLevel } from '~/lib/LevelSystem';
import { checkDataIntegrity, setProtectionMarker } from '~/lib/DataIntegritySystem';
import { useUserExp } from '~/hooks/useUserExp';
import { useHeartTreeExp } from '~/hooks/useHeartTreeExp';
import { useAchievements } from '~/hooks/useAchievements';
import { useDataSync } from '~/hooks/useDataSync';
import { useDashboardData } from '~/hooks/useDashboardData';
import { useProjects } from '~/hooks/useProjects';
import { syncToDatabase } from '~/lib/realtimeSync';
import { userStorageJSON, getUserStorage, setUserStorage, setCurrentUserId } from '~/lib/userStorage';
import { 
  pickHomeSentence, 
  pickSentenceFromPool,
  pickUniversalSentence, 
  pickEventSentence, 
  EchoHomeStatus,
  EchoEventKey
} from '~/lib/echoSpiritDialogueV2';
import { HeartTreeManager } from '~/lib/HeartTreeSystem';
import { handleAwarenessEvent, AwarenessContext } from '~/awareness';
import {
  gainHeartTreeExp,
  grantFertilizerBuff,
  loadHeartTreeExpState,
  EXP_FOCUS_COMPLETED,
  EXP_FOCUS_BASIC,
  EXP_GOAL_CHECKED,
  EXP_MILESTONE,
  EXP_STREAK_DAY,
} from '~/lib/HeartTreeExpSystem';
import {
  FlowMetrics,
  FlowUpdateContext,
  FlowIndexResult,
  updateDailyBehaviorRecord,
  calculateWeeklyBehaviorScore,
  ensureFlowMetricsShape,
  applyTempFlowDecay,
  applyImpressionCooling,
  calculateSessionQuality,
  computeFlowIndex,
  MIN_IMPRESSION,
  MAX_IMPRESSION,
  MIN_TEMP_FLOW,
  MAX_TEMP_FLOW,
  clamp
} from '~/lib/flowEngine';

interface Project {
  id: string;
  name: string;
  icon: string;
  dailyGoalMinutes: number;
  milestones: Milestone[];
  finalGoal?: {
    content: string;
    createdAt: string;
    isCompleted: boolean;
    completedAt?: string;
  };
  isActive: boolean;
  isPrimary?: boolean;
}

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

const MIN_FOCUS_MINUTES = 25; // 用于判断“达到最小专注时长”的日级阈值（可按需调整）
const JUST_COMPLETED_FOCUS_FLAG = 'justCompletedFocusAt';
const FOCUS_END_AGITATED_MESSAGES = [
  '这段并不轻松，但你还是带着它走到了终点。',
  '你没有假装轻松，这反而很真实。',
  '你今天走得不顺，可你没有丢下自己。',
  '这一路有点重，但你还是把它走完了。',
  '你把难的部分带过来了，这很了不起。',
];
const FOCUS_END_EARLY_MESSAGES = [
  '到这里也可以。',
  '不是每一次都要走到最后。',
  '这一次先停在这里，也没关系。',
  '你愿意停下来，也是一种照顾。',
  '走到这就够了，剩下的以后再说。',
];

const pickRandomFromPool = (pool: string[]) => {
  if (!pool.length) return '';
  return pool[Math.floor(Math.random() * pool.length)];
};

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
  echoCompanionDays: number;
  completedGoals: number;
}

const getPositiveBehaviorBoost = (normalizedScore: number) => {
  if (normalizedScore >= 0.85) return 1.35;
  if (normalizedScore >= 0.7) return 1.2;
  if (normalizedScore >= 0.55) return 1.1;
  if (normalizedScore >= 0.4) return 1.0;
  if (normalizedScore >= 0.25) return 0.85;
  return 0.7;
};

const getNegativeBehaviorBoost = (normalizedScore: number) => {
  if (normalizedScore >= 0.5) return 1;
  if (normalizedScore >= 0.3) return 1.15;
  return 1.35;
};

const getBehaviorFatiguePenalty = (normalizedScore: number) => {
  if (normalizedScore >= 0.2) return 0;
  return (0.2 - normalizedScore) * 12;
};


// 成就展开组件（默认展开）- 显示真实成就数据
function AchievementsSection() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pinnedBadge, setPinnedBadge] = useState<any | null>(null);

  const badgeData = [
    { id: 'badge_diamond', name: '钻石勋章', icon: '💎', description: '专注带来的永恒闪耀', level: 4 },
    { id: 'badge_gold', name: '黄金勋章', icon: '🥇', description: '证明你的卓越与非凡', level: 3 },
    { id: 'badge_silver', name: '白银勋章', icon: '🥈', description: '展现你的专注与毅力', level: 2 },
    { id: 'badge_bronze', name: '青铜勋章', icon: '🥉', description: '彰显你的努力与坚持', level: 1 },
  ];

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
    let mounted = true;
    const loadPinnedBadge = async () => {
      try {
        const res = await fetch('/api/shop/items');
        if (!res.ok) return;
        const items = await res.json();
        const purchased = items
          .filter((item: any) => item.type === 'badge' && item.purchased)
          .map((item: any) => item.id);

        const badgePriority = ['badge_diamond', 'badge_gold', 'badge_silver', 'badge_bronze'];
        const highestId = badgePriority.find(id => purchased.includes(id));
        const highestBadge = badgeData.find(b => b.id === highestId) || null;

        if (mounted) {
          setPinnedBadge(
            highestBadge
              ? { ...highestBadge, category: 'badge' }
              : null
          );
        }
      } catch (error) {
        console.error('加载勋章失败:', error);
      }
    };

    loadPinnedBadge();
    const interval = setInterval(loadPinnedBadge, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
  
  useEffect(() => {
    const manager = getAchievementManager();
    const allAchievements = manager.getAllAchievements();

    // 过滤出已解锁的成就，并按类别排序以获得更好的显示顺序
    // 确保里程碑成就优先显示（至少显示2个）
    const unlockedAchievements = allAchievements
      .filter(a => manager.isAchievementUnlocked(a.id));
    
    const milestoneAchievements = unlockedAchievements.filter(a => a.category === 'milestone');
    const otherAchievements = unlockedAchievements.filter(a => a.category !== 'milestone');
    
    // 优先显示里程碑成就（至少2个），然后显示其他成就
    const sortedAchievements = [
      ...milestoneAchievements.slice(0, 2), // 至少显示2个里程碑成就
      ...otherAchievements.sort((a, b) => {
        const order: Record<string, number> = { 'first': 0, 'flow': 1, 'time': 2, 'daily': 3, 'milestone': 4, 'special': 5 };
        return (order[a.category] ?? 6) - (order[b.category] ?? 6);
      }),
      ...milestoneAchievements.slice(2) // 剩余的里程碑成就
    ];
    
    setAchievements(sortedAchievements);
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
      case 'badge':
        return 'from-amber-500 to-yellow-400';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };
  
  // 获取最近5个成就
  const recentAchievements = pinnedBadge
    ? [pinnedBadge, ...achievements.filter(a => a.id !== pinnedBadge.id)].slice(0, 5)
    : achievements.slice(0, 5);
  const unlockedCount = achievements.length + (pinnedBadge ? 1 : 0);
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>🏆</span>
          最近成就
          {unlockedCount > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({unlockedCount}个已解锁)
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
                className={`flex-shrink-0 w-32 bg-gradient-to-br ${getAchievementGradient(achievement.category)} rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition`}
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
  
  // 🔥 关键修复：在使用任何 Hook 之前，先设置用户ID
  useEffect(() => {
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
      console.log('✅ Dashboard 已设置用户ID:', session.user.id);
      
      // 🧹 清理全局 localStorage key（防止数据污染）
      if (typeof window !== 'undefined') {
        const globalKeys = [
          'userExp', 'heartTreeExpState', 'userPlans',
          'todayStats', 'weeklyStats', 'totalFocusMinutes', 'focusSession'
        ];
        globalKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
          }
        });
        
        // 🔥 每次进入Dashboard都清除计划缓存时间戳，强制重新加载
        localStorage.removeItem('projectsSyncedAt');
        console.log('🔄 已清除计划缓存时间戳，将从数据库重新加载');
      }
    }
  }, [session?.user?.id]);
  
  // ========== 持久化 Hooks（数据库同步）==========
  const { userExp, userLevel: hookUserLevel, addUserExp, updateUserExp } = useUserExp();
  const { expState: heartTreeExpState, updateExpState: updateHeartTreeExpState } = useHeartTreeExp();
  const { unlockAchievement: unlockAchievementToDB } = useAchievements();
  const { syncStatus, syncAllData } = useDataSync(); // 🆕 数据同步 Hook
  
  // 监听用户等级变化，触发等级提升文案（数据库一致性 + 首次水合防误判）
  const prevUserLevelRef = useRef<number>(hookUserLevel);
  const levelHydratedRef = useRef(false);
  const remoteLastAnnouncedLevelRef = useRef(1);
  const sessionAnnouncedLevelRef = useRef(1);

  const persistAnnouncedLevel = useCallback(async (level: number) => {
    try {
      await fetch('/api/user/exp/announce-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcedLevel: level }),
      });
    } catch (error) {
      console.warn('[Dashboard] 持久化 lastAnnouncedLevel 失败:', error);
    }
  }, []);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      prevUserLevelRef.current = hookUserLevel;
      levelHydratedRef.current = false;
      remoteLastAnnouncedLevelRef.current = 1;
      sessionAnnouncedLevelRef.current = 1;
      return;
    }

    let cancelled = false;
    const run = async () => {
      // 首次水合：只校准基线，不触发升级播报
      if (!levelHydratedRef.current) {
        let remoteLast = 1;
        try {
          const response = await fetch('/api/user/exp');
          if (response.ok) {
            const data = await response.json();
            const parsed = Number(data?.lastAnnouncedLevel);
            remoteLast = Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
          }
        } catch (error) {
          console.warn('[Dashboard] 获取 lastAnnouncedLevel 失败，使用本地基线:', error);
        }
        if (cancelled) return;

        const baseline = Math.max(1, hookUserLevel, remoteLast);
        remoteLastAnnouncedLevelRef.current = baseline;
        sessionAnnouncedLevelRef.current = baseline;
        prevUserLevelRef.current = hookUserLevel;
        levelHydratedRef.current = true;

        if (baseline > remoteLast) {
          void persistAnnouncedLevel(baseline);
        }
        return;
      }

      const didLevelUp = hookUserLevel > prevUserLevelRef.current;
      const lastAnnouncedLevel = Math.max(
        remoteLastAnnouncedLevelRef.current,
        sessionAnnouncedLevelRef.current,
      );
      const shouldAnnounce = didLevelUp && hookUserLevel > lastAnnouncedLevel;

      if (shouldAnnounce) {
        console.log(`[Dashboard] 🎉 用户等级提升: ${prevUserLevelRef.current} → ${hookUserLevel}`);
        if (spiritDialogRef.current?.showLevelUpMessage) {
          spiritDialogRef.current.showLevelUpMessage();
        }
        sessionAnnouncedLevelRef.current = hookUserLevel;
        remoteLastAnnouncedLevelRef.current = hookUserLevel;
        void persistAnnouncedLevel(hookUserLevel);
      }

      prevUserLevelRef.current = hookUserLevel;
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [hookUserLevel, session?.user?.id, persistAnnouncedLevel]);
  
  // 🔥 统计数据从数据库加载
  const { 
    data: dashboardData, 
    refresh: refreshDashboardData,
    isLoading: dashboardDataLoading 
  } = useDashboardData();
  
  // 🔥 计划数据从数据库加载
  const { 
    projects: dbProjects,
    primaryProject: dbPrimaryProject,
    isLoading: projectsLoading,
    updateMilestones: updateMilestonesToDB,
    createProject: createProjectToDB,
    reload: refreshProjects,
  } = useProjects();
  
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
  const [spiritState, setSpiritState] = useState<'idle' | 'excited' | 'focus' | 'happy' | 'nod'>('idle'); // 小精灵状态
  const [currentSpiritState, setCurrentSpiritState] = useState<'idle' | 'excited' | 'focus' | 'happy' | 'nod' | 'highfive' | 'highfive-success'>('idle'); // 用于对话框的状态
  const [autoSpiritAnimation, setAutoSpiritAnimation] = useState<{ token: number; type: 'happy' | 'nod' | 'excited'; durationMs: number } | null>(null);
  const [initialPeriodicTimestamp, setInitialPeriodicTimestamp] = useState<number | null>(null);
  const spiritDialogRef = useRef<SpiritDialogRef>(null); // 对话框ref
  
  // 获取今日日期的工具函数
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  
  // 获取本周开始日期（周一00:00）- 根据用户时区
  const getCurrentWeekStart = (): string => {
    const now = new Date();
    // 获取用户时区的当前时间
    const day = now.getDay(); // 0=周日, 1=周一, ..., 6=周六
    // 计算到本周一的偏移天数
    const diff = day === 0 ? -6 : 1 - day; // 如果是周日，往前6天；否则往前(day-1)天
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0); // 设置为周一00:00:00
    return monday.toISOString().split('T')[0];
  };
  
  // 获取今日数据的工具函数
  const getTodayStats = (): TodayStats => {
    if (typeof window === 'undefined') return { minutes: 0, date: '' };
    const today = getTodayDate();
    const allTodayStats = userStorageJSON.get<Record<string, any>>('todayStats', {}) || {};
    return allTodayStats[today] || { minutes: 0, date: today };
  };
  
  // 获取本周数据的工具函数 - 检查是否需要重置（每周一00:00刷新）
  const getWeeklyStats = (): WeeklyStats => {
    if (typeof window === 'undefined') return { totalMinutes: 0, weekStart: '' };
    const saved = localStorage.getItem('weeklyStats');
    const currentWeekStart = getCurrentWeekStart();
    
    if (saved) {
      const savedStats: WeeklyStats = JSON.parse(saved);
      // 如果保存的周开始日期与当前周开始日期不同，说明到了新的一周，需要重置
      if (savedStats.weekStart !== currentWeekStart) {
        console.log('📅 新的一周开始！重置本周数据', {
          oldWeekStart: savedStats.weekStart,
          newWeekStart: currentWeekStart
        });
        // 重置本周数据为0，但保留weekStart为新的周开始日期
        const resetStats = { totalMinutes: 0, weekStart: currentWeekStart };
        localStorage.setItem('weeklyStats', JSON.stringify(resetStats));
        return resetStats;
      }
      return savedStats;
    }

    // 如果没有保存的数据，初始化本周数据
    return { totalMinutes: 0, weekStart: currentWeekStart };
  };

  // 获取总专注时长（从使用至今累计）
  // 注意：数据恢复逻辑已移至 useEffect，这里只负责读取
  const getTotalFocusMinutes = (): number => {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem('totalFocusMinutes');
    return saved ? parseFloat(saved) : 0;
  };

  // 保存总专注时长
  const saveTotalFocusMinutes = (minutes: number) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('totalFocusMinutes', minutes.toString());
  };

  // 保存今日数据（使用用户隔离存储）
  const saveTodayStats = (minutes: number) => {
    if (typeof window === 'undefined') return;
    const today = getTodayDate();
    const allTodayStats = userStorageJSON.get<Record<string, any>>('todayStats', {}) || {};
    allTodayStats[today] = { minutes, date: today };
    userStorageJSON.set('todayStats', allTodayStats);
    
    console.log('📊 今日统计已更新（用户隔离存储）');
  };
  
  // 保存本周数据（使用用户隔离存储）
  const saveWeeklyStats = (totalMinutes: number, weekStart: string) => {
    if (typeof window === 'undefined') return;
    userStorageJSON.set('weeklyStats', { totalMinutes, weekStart });
    
    console.log('📊 本周统计已更新（用户隔离存储）');
  };

  // 今日数据状态 - 🔥 优先使用数据库数据
  const [todayStats, setTodayStats] = useState<TodayStats>(() => {
    if (!dashboardDataLoading && dashboardData.todayMinutes >= 0) {
      return {
        minutes: dashboardData.todayMinutes,
        date: dashboardData.todayDate,
      };
    }
    return getTodayStats();
  });

  // 本周数据状态 - 🔥 优先使用数据库数据
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>(() => {
    if (!dashboardDataLoading && dashboardData.weeklyMinutes >= 0) {
      return {
        totalMinutes: dashboardData.weeklyMinutes,
        weekStart: dashboardData.weekStart,
      };
    }
    return getWeeklyStats();
  });

  // 总专注时长状态 - 🔥 优先使用数据库数据
  const [totalFocusMinutes, setTotalFocusMinutes] = useState<number>(() => {
    if (!dashboardDataLoading && dashboardData.totalMinutes >= 0) {
      return dashboardData.totalMinutes;
    }
    return getTotalFocusMinutes();
  });

  // 从localStorage加载统计数据（其他数据）- 🔥 streakDays 优先使用数据库
  const [stats, setStats] = useState<DashboardStats>(() => {
    if (typeof window !== 'undefined') {
      const savedStats = localStorage.getItem('dashboardStats');
      const parsed = savedStats ? JSON.parse(savedStats) : {
        yesterdayMinutes: 0,
        streakDays: 0,
        echoCompanionDays: 0,
        completedGoals: 0
      };
      
      // 如果有数据库数据，使用数据库的 streakDays
      if (!dashboardDataLoading && dashboardData.streakDays >= 0) {
        parsed.streakDays = dashboardData.streakDays;
      }
      if (!dashboardDataLoading && dashboardData.echoCompanionDays >= 0) {
        parsed.echoCompanionDays = dashboardData.echoCompanionDays;
      }
      
      return parsed;
    }
    return {
      yesterdayMinutes: 0,
      streakDays: dashboardData.streakDays || 0,
      echoCompanionDays: dashboardData.echoCompanionDays || 0,
      completedGoals: 0
    };
  });

  // 记录近10分钟内的小精灵点击，用于觉察规则6
  const [lumiClickEvents, setLumiClickEvents] = useState<number[]>([]);

  // 主要计划状态 - 🔥 优先从数据库加载
  // 直接使用数据库的主计划，不维护额外state
  const primaryPlan = dbPrimaryProject;

  // 成就系统相关 - 必须在所有条件返回之前声明
  const [achievementManager, setAchievementManager] = useState<AchievementManager | null>(null);
  const [showAchievementPanel, setShowAchievementPanel] = useState(false);
  const [showMailPanel, setShowMailPanel] = useState(false);
  const { unreadCount, refresh: refreshMails } = useMailSystem();

  // 构建小精灵点击的觉察上下文（仅用于规则6）
  const buildLumiClickAwarenessContext = (clicks: number[]): AwarenessContext => {
    const now = Date.now();
    const today = getTodayDate();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
      // 从本地存储读取心树命名状态（供觉察与文案个性化使用）
      let hasNamedHeartTree = false;
      let heartTreeName: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const storedName = localStorage.getItem('heartTreeNameV1');
        if (storedName && storedName.trim().length > 0) {
          hasNamedHeartTree = true;
          heartTreeName = storedName.trim();
        }
      }

      const userState = {
      userId: userId || 'local_user',
      currentStreak: Math.max(1, stats.streakDays || 1),
      streakStableDays: Math.max(0, stats.streakDays || 0),
      lastActiveDate: today,
      timezone,
        hasNamedHeartTree,
        heartTreeName,
    };

    const dayStats = {
      date: today,
      appForegroundMinutes: 0,
      homeStayMinutes: 0,
      focusTotalMinutes: todayStats.minutes || 0,
      focusGoalMinutes: undefined,
      focusSessionCount: 0,
      focusShortSessionCount: 0,
      focusTimerOpenCountNoStart: 0,
      lumiClickCount: clicks.length,
    };

    const recentEvents = clicks.map((ts) => ({
      userId: userState.userId,
      type: 'LUMI_CLICK' as const,
      ts,
    }));

    return {
      userState,
      today: dayStats,
      lastNDays: [dayStats],
      nowTs: now,
      nowLocalHour: new Date(now).getHours(),
      nowLocalMinute: new Date(now).getMinutes(),
      recentEvents,
    };
  };

  // 构建深夜在线觉察上下文（用于 22:30 之后的自动陪伴）
  const buildLateNightAwarenessContext = useCallback((): AwarenessContext => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';

    let hasNamedHeartTree = false;
    let heartTreeName: string | undefined = undefined;
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('heartTreeNameV1');
      if (storedName && storedName.trim().length > 0) {
        hasNamedHeartTree = true;
        heartTreeName = storedName.trim();
      }
    }

    const userState = {
      userId: userId || 'local_user',
      currentStreak: Math.max(1, stats.streakDays || 1),
      streakStableDays: Math.max(0, stats.streakDays || 0),
      lastActiveDate: today,
      timezone,
      hasNamedHeartTree,
      heartTreeName,
    };

    const dayStats = {
      date: today,
      appForegroundMinutes: 0,
      homeStayMinutes: 0,
      focusTotalMinutes: todayStats.minutes || 0,
      focusGoalMinutes: undefined,
      focusSessionCount: 0,
      focusShortSessionCount: 0,
      focusTimerOpenCountNoStart: 0,
      lumiClickCount: 0,
    };

    const recentEvents = [
      {
        userId: userState.userId,
        type: 'APP_FOREGROUND_START' as const,
        ts: now,
      },
    ];

    return {
      userState,
      today: dayStats,
      lastNDays: [dayStats],
      nowTs: now,
      nowLocalHour: new Date(now).getHours(),
      nowLocalMinute: new Date(now).getMinutes(),
      recentEvents,
    };
  }, [stats.streakDays, todayStats.minutes, userId]);

  // 处理规则6（多次点击小精灵）觉察触发
  const handleLumiClickAwareness = (clicks: number[]): boolean => {
    try {
      const ctx = buildLumiClickAwarenessContext(clicks);
      const response = handleAwarenessEvent(ctx);
      if (response && response.match.ruleId === 'SCENE6_LUMI_CLICK_MANY') {
        spiritDialogRef.current?.showAwarenessMessage?.(response.copy, 10000);
        return true;
      }
    } catch (err) {
      console.warn('触发觉察机制时出现问题（LUMI_CLICK）:', err);
    }
    return false;
  };

  // 小精灵点击统一处理：经验值 + 觉察检查 + 文案展示
  const handleSpiritClick = async () => {
    console.log('[Dashboard] 小精灵被点击');
    
    const today = getTodayDate();
    if (typeof window !== 'undefined') {
      const lastSpiritInteractionDate = localStorage.getItem('lastSpiritInteractionDate');
      if (lastSpiritInteractionDate !== today) {
        const spiritExp = LevelManager.calculateSpiritInteractionExp();
        await addUserExp(spiritExp);
        localStorage.setItem('lastSpiritInteractionDate', today);
      }
    }

    // 记录点击并检查觉察
    const now = Date.now();
    let handledAwareness = false;
    setLumiClickEvents((prev) => {
      const recent = prev.filter((ts) => now - ts <= 10 * 60 * 1000);
      const updated = [...recent, now];
      handledAwareness = handleLumiClickAwareness(updated);
      return updated;
    });

    console.log('[Dashboard] 觉察处理结果:', handledAwareness);

    // 若未触发觉察，显示普通对话
    if (!handledAwareness && spiritDialogRef.current) {
      const heartTreeLevel = heartTreeExpState.level || 0;
      const flowIndexScore = flowIndex.score || 0;
      
      console.log('[Dashboard] 调用 showMessage, 心树等级:', heartTreeLevel, '心流指数:', flowIndexScore);
      spiritDialogRef.current.showMessage(heartTreeLevel, flowIndexScore);
    } else {
      console.log('[Dashboard] 觉察已处理或ref不存在');
    }
  };

  const triggerAutoSpiritAnimation = (animation?: 'happy' | 'nod' | 'excited', durationMs: number = 2000) => {
    if (!animation) return;
    setAutoSpiritAnimation({
      token: Date.now(),
      type: animation,
      durationMs,
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (initialPeriodicTimestamp !== null) return;
    const cached = localStorage.getItem('lastPeriodicSpiritAt');
    if (cached) {
      const parsed = Date.parse(cached);
      if (!Number.isNaN(parsed)) {
        setInitialPeriodicTimestamp(parsed);
      }
    }
  }, [initialPeriodicTimestamp]);

  const loadSpiritDialogState = async () => {
    try {
      const response = await fetch('/api/user/spirit-dialog');
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      if (data?.lastWelcomeDate) {
        localStorage.setItem('lastWelcomeDate', data.lastWelcomeDate);
      }
      if (data?.lastPeriodicSpiritAt) {
        localStorage.setItem('lastPeriodicSpiritAt', data.lastPeriodicSpiritAt);
        const parsed = Date.parse(data.lastPeriodicSpiritAt);
        if (!Number.isNaN(parsed)) {
          setInitialPeriodicTimestamp(parsed);
        }
      }
      return data as { lastWelcomeDate?: string | null; lastPeriodicSpiritAt?: string | null };
    } catch (error) {
      console.warn('[Dashboard] 读取小精灵状态失败，使用本地缓存:', error);
      return null;
    }
  };

  const persistSpiritDialogState = async (payload: { lastWelcomeDate?: string; lastPeriodicSpiritAt?: string }) => {
    try {
      await fetch('/api/user/spirit-dialog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn('[Dashboard] 同步小精灵状态失败:', error);
    }
  };
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [unviewedAchievements, setUnviewedAchievements] = useState<any[]>([]);
  const [showQuickSearchGuide, setShowQuickSearchGuide] = useState(false);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  
  // ========== 同步 Hook 的用户等级到本地 state ==========
  useEffect(() => {
    if (hookUserLevel > 0) {
      const levelInfo = LevelManager.calculateLevel(userExp);
      setUserLevel(levelInfo);
    }
  }, [hookUserLevel, userExp]);
  
  const [completingMilestoneId, setCompletingMilestoneId] = useState<string | null>(null); // 正在完成的小目标ID（用于动画）
  const [selectedMilestoneIds, setSelectedMilestoneIds] = useState<Set<string>>(new Set()); // 多选的小目标ID集合
  const [showWeeklyInfo, setShowWeeklyInfo] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [showFlowInfo, setShowFlowInfo] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [fruits, setFruits] = useState(0);
  const [theme, setThemeState] = useState<'default' | 'echo' | 'salt_blue' | 'fresh_green' | 'spring' | 'summer' | 'autumn' | 'winter'>('default');
  
  // 客户端加载主题（必须在useEffect中，避免SSR问题）
  useEffect(() => {
    const savedTheme = getCurrentTheme();
    console.log('[Dashboard] 客户端加载主题:', savedTheme);
    setThemeState(savedTheme);
  }, []);

  // 登录后从数据库同步主题（跨设备一致性）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!authKey.startsWith('authenticated_')) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/theme');
        if (!res.ok) return;
        const data = await res.json();
        const serverTheme = data?.theme;
        if (serverTheme && ['default', 'echo', 'salt_blue', 'fresh_green', 'spring', 'summer', 'autumn', 'winter'].includes(serverTheme)) {
          localStorage.setItem('selectedTheme', serverTheme);
          if (!cancelled) {
            setThemeState(serverTheme);
          }
        }
      } catch (err) {
        console.warn('[Dashboard] 同步主题失败，使用本地主题:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authKey]);
  
  // 启动激励相关状态
  const [showStartupMotivation, setShowStartupMotivation] = useState(false);
  const [showGoalInputModal, setShowGoalInputModal] = useState(false);
  const [selectedGoalMilestoneId, setSelectedGoalMilestoneId] = useState<string | null>(() => {
    // 从 localStorage 读取今日选中的小目标
    if (typeof window !== 'undefined') {
      const today = getTodayDate();
      const savedDate = localStorage.getItem('todaySelectedGoalDate');
      const savedId = localStorage.getItem('todaySelectedGoalId');
      
      // 如果是今天选中的，恢复状态
      if (savedDate === today && savedId) {
        return savedId;
      }
    }
    return null;
  }); // 今日选中的小目标ID

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

  // Echo陪伴：当天首次登录 Dashboard 记 1 天（累计，不要求连续）
  useEffect(() => {
    if (typeof window === 'undefined' || dashboardDataLoading) return;

    const today = getTodayDate();
    const loginCountedKey = `echoCompanionCounted_${today}`;
    const syncPendingKey = `echoCompanionSyncPending_${today}`;
    const alreadyCountedInDB = dashboardData.lastEchoCompanionDate === today;
    const alreadyCountedLocal = localStorage.getItem(loginCountedKey) === 'true';
    const pendingSync = localStorage.getItem(syncPendingKey) === 'true';

    if (alreadyCountedInDB) {
      // 跨设备幂等：数据库已记过今天，前端不再重复 +1
      localStorage.setItem(loginCountedKey, 'true');
      localStorage.removeItem(syncPendingKey);
      setStats(prev => ({
        ...prev,
        echoCompanionDays: Math.max(prev.echoCompanionDays || 0, dashboardData.echoCompanionDays || 0),
      }));
      return;
    }

    if (alreadyCountedLocal && !pendingSync) return;

    const savedStats = localStorage.getItem('dashboardStats');
    const savedCompanionDays = savedStats ? (JSON.parse(savedStats).echoCompanionDays || 0) : 0;
    let targetCompanionDays = Math.max(savedCompanionDays, dashboardData.echoCompanionDays || 0);

    // 当天首次本地计数
    if (!alreadyCountedLocal) {
      targetCompanionDays += 1;
      setStats(prev => {
        const updated = { ...prev, echoCompanionDays: targetCompanionDays };
        localStorage.setItem('dashboardStats', JSON.stringify(updated));
        return updated;
      });
      localStorage.setItem('lastFocusDate', today);
      localStorage.setItem(loginCountedKey, 'true');

      try {
        gainHeartTreeExp(EXP_STREAK_DAY);
        if ([7, 14, 30].includes(targetCompanionDays)) {
          const state = loadHeartTreeExpState();
          grantFertilizerBuff(state);
        }
      } catch (e) {
        console.error('Echo陪伴累计时更新心树奖励失败:', e);
      }
    }

    localStorage.setItem(syncPendingKey, 'true');

    // 同步到数据库，独立维护 Echo陪伴 天数
    if (session?.user?.id) {
      fetch('/api/user/stats/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          echoCompanionDays: targetCompanionDays,
          lastEchoCompanionDate: today,
        }),
      }).then(res => {
        if (res.ok) {
          localStorage.removeItem(syncPendingKey);
          console.log('✅ Echo陪伴天数已同步到数据库');
        } else {
          console.warn('⚠️ Echo陪伴天数同步失败');
        }
      }).catch(err => {
        console.error('❌ Echo陪伴天数同步出错:', err);
      });
    }
  }, [dashboardDataLoading, dashboardData.echoCompanionDays, dashboardData.lastEchoCompanionDate, session?.user?.id]);

  // 增加完成的小目标计数
  const incrementCompletedGoals = (count: number) => {
    updateStats({
      completedGoals: stats.completedGoals + count
    });
  };

  // 🌟 启动激励 - 确认小目标
  const handleConfirmGoal = (milestoneId: string) => {
    console.log('📌 确认今日小目标:', milestoneId);
    setSelectedGoalMilestoneId(milestoneId);
    // 标记小目标为"被选中状态"
    if (typeof window !== 'undefined') {
      localStorage.setItem('todaySelectedGoalId', milestoneId);
      localStorage.setItem('todaySelectedGoalDate', getTodayDate());
    }
  };

  // 🌟 启动激励 - 快速启动（直接进入专注）
  const handleQuickStartFromMotivation = () => {
    // 如果有计划，使用计划的每日目标时长；如果没有计划（自由专注），默认15分钟
    const dailyGoal = primaryPlan?.dailyGoalMinutes || 15;
    console.log('⚡ 快速启动专注，目标时长:', dailyGoal, primaryPlan ? '(计划目标)' : '(自由专注默认)');
    router.push(`/focus?duration=${dailyGoal}&quickStart=true`);
  };

  // 🌟 启动激励 - 添加小目标到计划
  const handleAddMilestoneFromMotivation = async (title: string) => {
    if (!primaryPlan) {
      console.error('没有主计划，无法添加小目标');
      return;
    }

    const newMilestone = {
      id: `milestone-${Date.now()}`,
      title: title.trim(),
      isCompleted: false,
      order: (primaryPlan.milestones?.length || 0) + 1
    };

    console.log('📝 添加小目标到计划:', { planId: primaryPlan.id, title });

    // 保存到数据库
    if (primaryPlan && session?.user?.id) {
      const updatedMilestones = [...(primaryPlan.milestones || []), newMilestone];
      const success = await updateMilestonesToDB(primaryPlan.id, updatedMilestones);
      if (success) {
        console.log('✅ 小目标已同步到数据库');
        await refreshProjects();
      } else {
        console.error('❌ 同步小目标失败');
      }
    }
  };

  // 播放完成音效 - 叮咚音效
  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 生成叮咚音效（两个音符：D5和A5，形成和谐的"叮咚"声）
      const frequencies = [587.33, 880.00]; // D5和A5音符
      
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = freq;
          oscillator.type = 'sine'; // 使用正弦波，声音更柔和
          
          // 音量包络：快速上升，然后缓慢衰减
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.4);
        }, index * 150); // 两个音符间隔150ms
      });
    } catch (error) {
      // 如果Web Audio API不可用，忽略错误
      console.log('Web Audio API not available');
    }
  };

  // 切换小目标选中状态（多选）
  const handleMilestoneToggle = (milestoneId: string) => {
    const milestone = primaryPlan?.milestones.find(m => m.id === milestoneId);
    if (milestone && !milestone.isCompleted) {
      setSelectedMilestoneIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(milestoneId)) {
          newSet.delete(milestoneId);
        } else {
          newSet.add(milestoneId);
        }
        return newSet;
      });
    }
  };

  // 确认完成选中的小目标（支持多选）
  const confirmMilestoneComplete = () => {
    const milestoneIdsToComplete = Array.from(selectedMilestoneIds);
    if (milestoneIdsToComplete.length === 0) return;
    
    // 播放完成音效（批量完成时播放一次）
    playCompletionSound();
    
    // 批量完成小目标
    handleBulkMilestoneToggle(milestoneIdsToComplete);
    
    // 清除选中状态
    setSelectedMilestoneIds(new Set());
  };

  // 取消选择
  const cancelMilestoneSelection = () => {
    setSelectedMilestoneIds(new Set());
  };

  // 批量完成多个小目标
  const handleBulkMilestoneToggle = (milestoneIds: string[]) => {
    if (milestoneIds.length === 0) return;
    
    // 设置第一个正在完成的小目标ID（用于动画）
    if (milestoneIds.length > 0) {
      setCompletingMilestoneId(milestoneIds[0]);
    }
    
    // 延迟执行完成逻辑，让动画先播放
    setTimeout(async () => {
      if (primaryPlan && session?.user?.id) {
        const updatedMilestones = primaryPlan.milestones.map(m =>
          milestoneIds.includes(m.id) ? { ...m, isCompleted: true } : m
        );

        console.log('💾 批量更新小目标到数据库', {
          projectId: primaryPlan.id,
          milestoneIds,
          count: milestoneIds.length,
        });
        
        updateMilestonesToDB(primaryPlan.id, updatedMilestones).then(success => {
          if (success) {
            console.log('✅ 小目标已同步到数据库');
            // 刷新计划数据
            refreshProjects();
          } else {
            console.error('❌ 同步小目标失败');
          }
        });
      }

      // 批量完成小目标获得经验值（移到 setPrimaryPlan 之外）
      if (typeof window !== 'undefined') {
        const milestoneExp = LevelManager.calculateMilestoneExp(); // 每个5 EXP
        const totalExpToAdd = milestoneExp * milestoneIds.length;
        
        const oldLevel = LevelManager.calculateLevel(userExp);
        await addUserExp(totalExpToAdd); // 使用 Hook 自动保存到数据库
        const newLevel = LevelManager.calculateLevel(userExp + totalExpToAdd);
        setUserLevel(newLevel);
        
        if (newLevel.currentLevel > oldLevel.currentLevel) {
          console.log('🎉 等级提升！（批量完成小目标触发）', newLevel);
        }
        
        // 心树 EXP 系统：小目标完成事件
        try {
          // 每个里程碑 30 EXP
          const baseExp = EXP_MILESTONE * milestoneIds.length;
          const newHeartTreeState = gainHeartTreeExp(baseExp);
          await updateHeartTreeExpState(newHeartTreeState);
          console.log('🌳 心树 EXP +', baseExp, '（完成', milestoneIds.length, '个小目标）');
        } catch (e) {
          console.error('小目标完成时更新心树 EXP 失败:', e);
        }
      }

      // 更新完成的小目标计数（触发成就检查）
      incrementCompletedGoals(milestoneIds.length);

      // 🌟 如果完成的小目标中包含今日选中的小目标，清除选中状态
      if (selectedGoalMilestoneId && milestoneIds.includes(selectedGoalMilestoneId)) {
        setSelectedGoalMilestoneId(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('todaySelectedGoalId');
          localStorage.removeItem('todaySelectedGoalDate');
        }
        console.log('✅ 今日选中的小目标已完成，清除选中状态');
      }

      // 清除动画状态
      setTimeout(() => {
        setCompletingMilestoneId(null);
      }, 300); // 等待淡出动画完成
    }, 500); // 显示划掉动画的时间
  };

  // 更新心流指标
  const updateFlowMetrics = (
    sessionMinutes: number,
    rating: number = 2,
    context: FlowUpdateContext = {}
  ) => {
    if (typeof window === 'undefined') return;

    const flowData = localStorage.getItem('flowMetrics');
    const now = Date.now();
    const metrics = ensureFlowMetricsShape(flowData ? JSON.parse(flowData) : undefined);

    applyTempFlowDecay(metrics, now);
    applyImpressionCooling(metrics, now);

    const weeklyBehavior = calculateWeeklyBehaviorScore();
    const positiveBehaviorBoost = getPositiveBehaviorBoost(weeklyBehavior.normalizedScore);
    const negativeBehaviorBoost = getNegativeBehaviorBoost(weeklyBehavior.normalizedScore);

    const safeRating = typeof rating === 'number' ? rating : 2;
    const completedSession = context.completedSession !== false;
    const interrupted = context.interrupted ?? !completedSession;
    const sessionQuality = calculateSessionQuality({
      sessionMinutes,
      rating: safeRating,
      dailyGoalMinutes: context.dailyGoalMinutes,
      completedDailyGoal: context.completedDailyGoal
    });

    if (sessionQuality >= 0.75) {
      metrics.recentQualityStreak += 1;
    } else if (sessionQuality < 0.5) {
      metrics.recentQualityStreak = 0;
    }

    const streakFactor = clamp((context.streakDays || 0) / 14, 0, 1);
    const baseGain =
      sessionQuality >= 0.85 ? 1.1 :
      sessionQuality >= 0.7 ? 0.8 :
      sessionQuality >= 0.5 ? 0.45 :
      0.2;
    const impressionPenalty =
      interrupted ? 0.8 :
      sessionQuality < 0.3 ? 0.3 :
      0;

    metrics.impressionScore = clamp(
      metrics.impressionScore +
        baseGain +
        streakFactor * 0.5 +
        (context.completedDailyGoal ? 0.4 : 0) -
        impressionPenalty,
      MIN_IMPRESSION,
      MAX_IMPRESSION
    );

    let tempDelta = sessionQuality * 18 * positiveBehaviorBoost;
    if (context.completedDailyGoal) tempDelta += 6 * positiveBehaviorBoost;
    if (!completedSession) tempDelta -= 6 * negativeBehaviorBoost;
    if (interrupted) tempDelta -= 8 * negativeBehaviorBoost;
    tempDelta += Math.min(metrics.recentQualityStreak * 1.5, 8) * positiveBehaviorBoost;
    if (sessionQuality < 0.45) {
      tempDelta -= (0.45 - sessionQuality) * 15 * negativeBehaviorBoost;
    }
    if (weeklyBehavior.normalizedScore < 0.35 && sessionQuality < 0.55) {
      tempDelta -= (0.35 - weeklyBehavior.normalizedScore) * 10;
    }

    metrics.tempFlowScore = clamp(
      metrics.tempFlowScore + tempDelta,
      MIN_TEMP_FLOW,
      MAX_TEMP_FLOW
    );

    const fatiguePenalty = getBehaviorFatiguePenalty(weeklyBehavior.normalizedScore);
    if (fatiguePenalty > 0) {
      metrics.tempFlowScore = clamp(
        metrics.tempFlowScore - fatiguePenalty,
        MIN_TEMP_FLOW,
        MAX_TEMP_FLOW
      );
    }

    // 更新基本累计指标
    metrics.totalFocusMinutes += sessionMinutes;
    metrics.sessionCount += 1;
    metrics.longestSession = Math.max(metrics.longestSession, sessionMinutes);
    metrics.averageSessionLength = metrics.totalFocusMinutes / Math.max(metrics.sessionCount, 1);

    metrics.averageRating = ((metrics.averageRating * (metrics.sessionCount - 1)) + safeRating) / metrics.sessionCount;
    metrics.completionRate = ((metrics.completionRate * (metrics.sessionCount - 1)) + (completedSession ? 1 : 0)) / metrics.sessionCount;
    metrics.interruptionRate = ((metrics.interruptionRate * (metrics.sessionCount - 1)) + (interrupted ? 1 : 0)) / metrics.sessionCount;
    metrics.consistencyScore = Math.min(metrics.sessionCount / 14, 1);
    metrics.improvementTrend = metrics.improvementTrend * 0.7 + (sessionQuality - 0.6) * 0.3;
    metrics.currentStreak = context.streakDays ?? metrics.currentStreak;

    metrics.lastSessionAt = new Date(now).toISOString();
    metrics.lastDecayAt = metrics.lastSessionAt;

    localStorage.setItem('flowMetrics', JSON.stringify(metrics));
  };

  // 专注完成后更新统计数据（由focus页面调用）
  const handleFocusSessionComplete = async (minutes: number, rating?: number, completed: boolean = true, goalMinutes?: number) => {
    const status = completed ? '✅ 完成' : '⚠️ 中断';
    console.log('📈 Dashboard收到专注报告', { 
      status,
      minutes, 
      rating
    });
    
    // 专注完成后，小精灵保持idle状态（不设置excited）
    // 用户点击时会随机播放happy或excited动画
    
    const today = getTodayDate();
    const lastFocusDate = localStorage.getItem('lastFocusDate');
    const isNewDay = lastFocusDate !== today;

    // 处理新的一天：归档昨日数据并重置今日数据
    if (isNewDay) {
      // 🔒 保护性检查：记录经验值状态，确保不被意外修改
      const beforeUserExp = getUserStorage('userExp');
      console.log('📅 新的一天开始 - 数据保护检查', {
        日期: today,
        昨日日期: lastFocusDate,
        当前用户经验: beforeUserExp,
        当前用户等级: userLevel?.currentLevel,
        提示: '经验值在日期切换时应保持不变'
      });
      
      // 归档昨日数据
      const yesterdayDate = lastFocusDate || today;
      const allTodayStats = userStorageJSON.get<Record<string, any>>('todayStats', {}) || {};
      const yesterdayMinutes = allTodayStats[yesterdayDate]?.minutes || 0;
      
      console.log('📅 新的一天开始！', {
        yesterdayDate,
        yesterdayMinutes,
        today
      });
      
      // 更新昨日数据到主统计数据
      updateStats({ yesterdayMinutes });
      
      console.log('🤝 Echo陪伴累计策略：按登录累计，不再按达标天补增', {
        yesterdayDate,
        yesterdayMinutes,
        当前累计: stats.streakDays,
      });
      
      // 保存今日日期标记
      localStorage.setItem('lastFocusDate', today);
      
      // 重置今日数据（从0开始）
      saveTodayStats(0);
      setTodayStats({ minutes: 0, date: today });
      
      // 🔒 保护性验证：确认经验值没有被意外修改
      const afterUserExp = getUserStorage('userExp');
      if (beforeUserExp !== afterUserExp) {
        console.error('❌❌❌ 严重警告：经验值在日期切换时被意外修改！', {
          切换前: beforeUserExp,
          切换后: afterUserExp,
          损失: (parseFloat(beforeUserExp || '0') - parseFloat(afterUserExp || '0')).toFixed(0) + ' EXP'
        });
        console.error('❌ 正在尝试恢复经验值...');
        // 尝试恢复
        if (beforeUserExp && parseFloat(beforeUserExp) > parseFloat(afterUserExp || '0')) {
          setUserStorage('userExp', beforeUserExp);
          console.log('✅ 经验值已恢复');
        }
      } else {
        console.log('✅ 经验值保护验证通过', { userExp: afterUserExp });
      }
      
      console.log('🔄 日期已更新', { today, streakDays: stats.streakDays });
    }
    
    // 更新今日数据
    const newTodayMinutes = todayStats.minutes + minutes;
    saveTodayStats(newTodayMinutes);
    setTodayStats(prev => ({ ...prev, minutes: newTodayMinutes }));
    
    // 更新本周数据（独立于今日数据，不受重置影响）
    // 先检查是否需要重置本周数据（每周一00:00刷新）
    const currentWeekStart = getCurrentWeekStart();
    let currentWeeklyTotal = weeklyStats.totalMinutes;
    let currentWeekStartDate = weeklyStats.weekStart;
    
    // 如果当前周开始日期与保存的不同，说明到了新的一周，重置本周数据
    if (currentWeekStartDate !== currentWeekStart) {
      console.log('📅 新的一周开始！重置本周数据', {
        oldWeekStart: currentWeekStartDate,
        newWeekStart: currentWeekStart
      });
      
      currentWeeklyTotal = 0;
      currentWeekStartDate = currentWeekStart;
    }
    
    const newWeeklyMinutes = currentWeeklyTotal + minutes;
    saveWeeklyStats(newWeeklyMinutes, currentWeekStartDate);
    setWeeklyStats({ totalMinutes: newWeeklyMinutes, weekStart: currentWeekStartDate });
    
    // 更新总专注时长（从使用至今累计，不受周重置影响）
    const currentTotalMinutes = getTotalFocusMinutes();
    const newTotalMinutes = currentTotalMinutes + minutes;
    saveTotalFocusMinutes(newTotalMinutes);
    setTotalFocusMinutes(newTotalMinutes);
    
    console.log('📊 数据已更新', {
      today: { minutes: newTodayMinutes },
      week: { totalMinutes: newWeeklyMinutes, weekStart: currentWeekStartDate },
      total: { totalMinutes: newTotalMinutes }
    });
    
    // 🔥 关键修复：专注完成后，延迟刷新数据库数据，确保跨设备一致性
    setTimeout(async () => {
      try {
        console.log('🔄 专注完成，从数据库刷新统计数据（确保跨设备一致）...');
        await refreshDashboardData(); // 从数据库重新加载todayStats、weeklyStats等
        console.log('✅ 统计数据已从数据库刷新');
      } catch (error) {
        console.error('❌ 刷新统计数据失败:', error);
      }
    }, 3000); // 延迟3秒，确保数据库已写入

    // 更新行为得分（用于临时心流倍率）
    const dailyGoalMinutes = goalMinutes || primaryPlan?.dailyGoalMinutes || 0;
    const completedDailyGoal = dailyGoalMinutes > 0 ? newTodayMinutes >= dailyGoalMinutes : false;
    const exceededDailyGoal = dailyGoalMinutes > 0 ? newTodayMinutes >= dailyGoalMinutes * 1.2 : false;

    updateDailyBehaviorRecord(today, {
      present: true,
      focused: true,
      metGoal: completedDailyGoal,
      overGoal: exceededDailyGoal
    });

    // 更新心流指标（包含周表现倍率）
    updateFlowMetrics(minutes, rating ?? 2, {
      completedSession: completed,
      interrupted: !completed,
    dailyGoalMinutes,
      completedDailyGoal,
      streakDays: stats.streakDays
    });

    // 更新等级经验值（使用本次会话判定基准）
    await updateUserExpFromSession(minutes, rating, completed, goalMinutes, newTodayMinutes);
    
    // 检查首次专注成就（在第一次完成专注时立即触发）
    if (completed && currentTotalMinutes === 0 && newTotalMinutes > 0) {
      // 第一次完成专注，标记到 localStorage
      localStorage.setItem('firstFocusCompleted', 'true');
    }
    
    // 心树机会：专注完成事件（不自动加经验，只发放机会）
    if (completed && minutes > 0 && typeof window !== 'undefined') {
      try {
        // 1）每次完成专注，累积一次浇水机会（可屯着不用）
        HeartTreeManager.addWaterOpportunityOnFocusComplete();
        console.log('🌳 心树浇水机会 +1');

        // 2）当今日总专注时长首次达到 / 超过每日目标时，额外给一次奖励机会（浇水 + 施肥）
        if (completedDailyGoal) {
          const today = getTodayDate();
          const rewarded = localStorage.getItem(`heartTreeDailyGoalReward_${today}`) === 'true';
          if (!rewarded) {
            HeartTreeManager.addRewardOnGoalComplete();
            localStorage.setItem(`heartTreeDailyGoalReward_${today}`, 'true');
            console.log('🌳 心树每日目标达成奖励：浇水 + 施肥 各 +1');
          }

          // 连胜天数（仅用于周报等真实统计）：当天首次达标时 +1
          const streakUpdatedToday = localStorage.getItem(`streakUpdated_${today}`) === 'true';
          if (!streakUpdatedToday) {
            const newStreakDays = stats.streakDays + 1;
            setStats(prev => ({ ...prev, streakDays: newStreakDays }));
            updateStats({ streakDays: newStreakDays });
            localStorage.setItem(`streakUpdated_${today}`, 'true');

            if (session?.user?.id) {
              fetch('/api/user/stats/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  streakDays: newStreakDays,
                  lastStreakDate: today,
                }),
              }).catch(err => {
                console.error('❌ 连胜天数同步出错:', err);
              });
            }
          }
        }
      } catch (e) {
        console.error('更新心树机会失败:', e);
      }
    }
    
    // 🌟 性能优化：标记需要刷新 Dashboard 数据（延迟刷新，避免阻塞）
    if (typeof window !== 'undefined') {
      localStorage.setItem('needRefreshDashboard', 'true');
    }
    
    console.log('✅ 统计数据已更新完成（已标记延迟刷新）');
  };

  // 更新用户经验值（优化后的经验值系统）
  const updateUserExpFromSession = async (
    minutes: number,
    rating?: number,
    completed: boolean = true,
    goalMinutes?: number,
    projectedTodayMinutes?: number,
  ) => {
    const currentExp = userExp; // 使用 Hook 的值
    
    let sessionExp = 0;
    
    if (completed && minutes > 0) {
      const dailyGoalMinutes = goalMinutes || primaryPlan?.dailyGoalMinutes || 0;
      const todayMinutes = projectedTodayMinutes ?? todayStats.minutes;
      
      // 判断经验值类型
      if (dailyGoalMinutes > 0 && todayMinutes >= dailyGoalMinutes) {
        // 完成主要计划设置最小专注时长：高经验值
        sessionExp = LevelManager.calculatePrimaryGoalExp(minutes, dailyGoalMinutes, stats.streakDays);
        console.log('📈 经验值类型：完成主要计划目标（高）', { minutes, dailyGoalMinutes, streakDays: stats.streakDays, exp: sessionExp });
      } else if (goalMinutes && minutes >= goalMinutes) {
        // 完成自己设定的专注时长（但未达到主要计划最小时长）：中经验值
        sessionExp = LevelManager.calculateCustomGoalExp(minutes, goalMinutes, stats.streakDays);
        console.log('📈 经验值类型：完成设定目标（中）', { minutes, goalMinutes, streakDays: stats.streakDays, exp: sessionExp });
      } else {
        // 每日完成专注（未完成设定目标）：低经验值
        sessionExp = LevelManager.calculateDailyFocusExp(minutes);
        console.log('📈 经验值类型：完成专注（低）', { minutes, exp: sessionExp });
      }
      
      // 质量加成（保留）
      if (rating === 3) {
        sessionExp = Math.floor(sessionExp * 1.5); // 3星 = 额外50%
      } else if (rating === 2) {
        sessionExp = Math.floor(sessionExp * 1.1); // 2星 = 额外10%
      }
    }
    
    const newTotalExp = currentExp + sessionExp;
    const oldLevel = LevelManager.calculateLevel(currentExp);
    const newLevel = LevelManager.calculateLevel(newTotalExp);
    
    // 保存经验值到数据库 + localStorage
    await updateUserExp(newTotalExp);
    
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
      level: newLevel.currentLevel,
      streakDays: stats.streakDays,
      streakBonus: `${((LevelManager.getStreakBonusMultiplier(stats.streakDays) - 1) * 100).toFixed(0)}%`
    });
  };

  // 暴露给 focus 页使用的函数
  if (typeof window !== 'undefined') {
    (window as any).reportFocusSessionComplete = (minutes: number, rating?: number, completed: boolean = true, goalMinutes?: number) => {
      handleFocusSessionComplete(minutes, rating, completed, goalMinutes);
    };
  }

  // ============================================
  // 数据恢复：从历史数据恢复总专注时长（组件挂载时执行一次）
  //
  // 恢复数据来源：
  // 1. flowMetrics.totalFocusMinutes - 旧版心流指标（优先，较精确）
  // 2. todayStats - 累计所有历史日期的专注时长（作为补充）
  //
  // 注意：
  // - 如果 flowMetrics 已恢复，todayStats 可能包含重复数据
  // - 为避免重复计算，优先使用 flowMetrics，必要时再补充 todayStats
  // - 恢复后写入 'dataRecovered' 标记，防止重复恢复
  // ============================================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 检查是否已经恢复过数据
    const dataRecovered = localStorage.getItem('dataRecovered');
    if (dataRecovered === 'true') {
      // 已经恢复过，直接返回
      return;
    }
    
    // 如果总专注时长为0，尝试恢复
    const currentTotal = getTotalFocusMinutes();
    if (currentTotal === 0) {
      let recoveredMinutes = 0;
      
      // 1. 从 flowMetrics.totalFocusMinutes 恢复（旧的心流指标数据）
      const flowData = localStorage.getItem('flowMetrics');
      if (flowData) {
        try {
          const metrics: FlowMetrics = ensureFlowMetricsShape(JSON.parse(flowData));
          if (metrics.totalFocusMinutes && metrics.totalFocusMinutes > 0) {
            recoveredMinutes += metrics.totalFocusMinutes;
            console.log('📦 从 flowMetrics 恢复数据:', metrics.totalFocusMinutes, '分钟');
          }
        } catch (e) {
          console.error('恢复 flowMetrics 数据失败:', e);
        }
      }
      
      // 2. 从历史 todayStats 恢复（累计所有历史日期的专注时长）
      // 注意：如果 flowMetrics 已恢复，todayStats 可能包含重复数据
      // 但为了完整性，我们仍然尝试恢复（实际使用时可以根据需要调整）
      const allTodayStats = userStorageJSON.get<Record<string, any>>('todayStats', {}) || {};
      if (Object.keys(allTodayStats).length > 0) {
        try {
          let historicalTotal = 0;
          for (const date in allTodayStats) {
            if (allTodayStats[date]?.minutes) {
              historicalTotal += allTodayStats[date].minutes;
            }
          }
          if (historicalTotal > 0) {
            // 如果 flowMetrics 已恢复且数值更大，说明数据已包含，跳过 todayStats
            if (recoveredMinutes > 0 && recoveredMinutes >= historicalTotal) {
              console.log('📦 todayStats 数据已包含在 flowMetrics 中，跳过');
            } else {
              recoveredMinutes += historicalTotal;
              console.log('📦 从历史 todayStats 恢复数据:', historicalTotal, '分钟');
            }
          }
        } catch (e) {
          console.error('恢复 todayStats 数据失败:', e);
        }
      }
      
      // 如果恢复了数据，保存并更新状态
      if (recoveredMinutes > 0) {
        console.log('✅ 数据恢复完成！总恢复时长:', recoveredMinutes, '分钟');
        saveTotalFocusMinutes(recoveredMinutes);
        setTotalFocusMinutes(recoveredMinutes);
        // 标记已恢复，避免重复恢复
        localStorage.setItem('dataRecovered', 'true');
      } else {
        // 如果没有可恢复的数据，也标记为已处理，避免重复检查
        localStorage.setItem('dataRecovered', 'true');
      }
    } else {
      // 如果已经有总专注时长数据，标记为已处理
      localStorage.setItem('dataRecovered', 'true');
    }
  }, []); // 只在组件挂载时执行一次

  // 🌟 监听日期变化，清除昨日选中的小目标
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const today = getTodayDate();
    const savedDate = localStorage.getItem('todaySelectedGoalDate');
    
    // 如果是新的一天，清除昨日选中的小目标
    if (savedDate && savedDate !== today) {
      localStorage.removeItem('todaySelectedGoalId');
      localStorage.removeItem('todaySelectedGoalDate');
      setSelectedGoalMilestoneId(null);
      console.log('📅 新的一天，清除昨日选中的小目标');
    }
  }, []); // 只在组件挂载时检查一次

  // 🔥 监听数据库数据变化，同步更新状态
  useEffect(() => {
    if (dashboardDataLoading) return;
    
    console.log('[Dashboard] 🔄 数据库数据已加载，同步更新状态', {
      todayMinutes: dashboardData.todayMinutes,
      weeklyMinutes: dashboardData.weeklyMinutes,
      totalMinutes: dashboardData.totalMinutes,
      streakDays: dashboardData.streakDays,
      echoCompanionDays: dashboardData.echoCompanionDays,
    });
    
    // 更新今日统计
    setTodayStats({
      minutes: dashboardData.todayMinutes,
      date: dashboardData.todayDate,
    });
    
    // 更新本周统计
    setWeeklyStats({
      totalMinutes: dashboardData.weeklyMinutes,
      weekStart: dashboardData.weekStart,
    });
    
    // 更新累计时长
    setTotalFocusMinutes(dashboardData.totalMinutes);
    
    // 更新天数：使用较大值，避免“本地已+1但数据库尚未刷新”被覆盖回退
    setStats(prev => ({
      ...prev,
      streakDays: Math.max(prev.streakDays || 0, dashboardData.streakDays || 0),
      echoCompanionDays: Math.max(prev.echoCompanionDays || 0, dashboardData.echoCompanionDays || 0),
    }));
    
    // 同步到 localStorage 缓存
    saveTodayStats(dashboardData.todayMinutes);
    saveWeeklyStats(dashboardData.weeklyMinutes, dashboardData.weekStart);
    saveTotalFocusMinutes(dashboardData.totalMinutes);
    
    console.log('[Dashboard] ✅ 状态同步完成');
  }, [dashboardDataLoading, dashboardData]);
  
  // 🔥 监听计划数据变化，同步更新主计划
  // 🔥 监听数据库计划数据，同步缓存
  useEffect(() => {
    if (projectsLoading) return;
    
    if (dbPrimaryProject) {
      console.log('[Dashboard] 🔄 主计划数据:', dbPrimaryProject.name);
      
      // 同步到 localStorage 缓存
      if (typeof window !== 'undefined') {
        localStorage.setItem('userPlans', JSON.stringify(dbProjects));
      }
    }
  }, [projectsLoading, dbPrimaryProject, dbProjects]);
  
  // 🌟 优化：检测专注完成标记，智能触发数据刷新
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const needRefresh = localStorage.getItem('needRefreshDashboard');
    if (needRefresh === 'true') {
      console.log('[Dashboard] 🔄 检测到专注完成，刷新统计数据...');
      
      // 🌟 优化：延迟刷新，避免阻塞专注完成的UI反馈
      setTimeout(() => {
        refreshDashboardData();
      }, 2000); // 延迟2秒，让用户先看到完成动画
      
      localStorage.removeItem('needRefreshDashboard');
    }
  }, [refreshDashboardData]);

  // 检查并重置本周数据（每周一00:00刷新）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const currentWeekStart = getCurrentWeekStart();
    const saved = localStorage.getItem('weeklyStats');
    
    if (saved) {
      const savedStats: WeeklyStats = JSON.parse(saved);
      // 如果保存的周开始日期与当前周开始日期不同，说明到了新的一周，需要重置
      if (savedStats.weekStart !== currentWeekStart) {
        console.log('📅 检测到新的一周！重置本周数据', {
          oldWeekStart: savedStats.weekStart,
          newWeekStart: currentWeekStart,
          oldTotalMinutes: savedStats.totalMinutes
        });
        // 重置本周数据为0，但保留weekStart为新的周开始日期
        const resetStats = { totalMinutes: 0, weekStart: currentWeekStart };
        localStorage.setItem('weeklyStats', JSON.stringify(resetStats));
        setWeeklyStats(resetStats);
      }
    } else {
      // 如果没有保存的数据，初始化本周数据
      const initialStats = { totalMinutes: 0, weekStart: currentWeekStart };
      localStorage.setItem('weeklyStats', JSON.stringify(initialStats));
      setWeeklyStats(initialStats);
    }
  }, []); // 只在组件挂载时检查一次

  // 🔥 优化的认证和数据加载检查
  useEffect(() => {
    console.log('🔍 Dashboard 加载检查', { 
      authKey,
      sessionStatus,
      timestamp: new Date().toISOString()
    });

    if (authKey === 'loading') {
      console.log('⏳ Session 加载中，等待...');
      return;
    }

    if (authKey === 'unauthenticated') {
      console.log('❌ 未认证，重定向到首页');
      router.push('/');
      return;
    }

    if (authKey.startsWith('authenticated_')) {
      console.log('✅ 用户已认证，显示 Dashboard');
      setIsLoading(false);
      
      // 延迟一会确保页面已渲染完成
      setTimeout(async () => {
        // 先检查专注完成标记，如果有则优先播放祝贺气泡（暂时仍使用旧池）
        const focusCompleted = localStorage.getItem('focusCompleted');
        if (focusCompleted === 'true') {
          if (spiritDialogRef.current) {
            spiritDialogRef.current.showCompletionMessage();
            localStorage.removeItem('focusCompleted');
          }
          return;
        }

        const focusEndReason = localStorage.getItem('focusEndReason');
        if (focusEndReason && spiritDialogRef.current) {
          const pool =
            focusEndReason === 'agitated_end'
              ? FOCUS_END_AGITATED_MESSAGES
              : FOCUS_END_EARLY_MESSAGES;
          const text = pickRandomFromPool(pool);
          if (text) {
            spiritDialogRef.current.showTypedMessage?.(text, 'philosophical');
          }
          localStorage.removeItem('focusEndReason');
          return;
        }
        
        // 🌟 启动激励逻辑：当日首次进入 App，且当日尚未开始任何一次专注
        const today = getTodayDate();
        const lastStartupMotivationDate = localStorage.getItem('lastStartupMotivationDate');
        const hasCompletedOnboarding = session?.user?.hasCompletedOnboarding;
        const newUserEntryDate = localStorage.getItem('isNewUserFirstEntry');
        const firstPlanCreatedDate = localStorage.getItem('firstPlanCreatedDate');
        const isFirstPlanDay = newUserEntryDate === today || firstPlanCreatedDate === today;

        // 清理过期的新手标记（非今日则移除）
        if (newUserEntryDate && newUserEntryDate !== today) {
          localStorage.removeItem('isNewUserFirstEntry');
        }
        
        // 检查是否应该显示启动激励
        // 新规则：仅在首次创建计划当天自动弹出；否则仅对未触发过“首次创建计划”用户保留每日自动弹出
        const allowDailyAuto = !firstPlanCreatedDate;
        const shouldShowMotivation = (
          (isFirstPlanDay && hasCompletedOnboarding) ||
          (allowDailyAuto && lastStartupMotivationDate !== today && todayStats.minutes === 0 && hasCompletedOnboarding)
        );
        
        if (shouldShowMotivation) {
          console.log('🌟 触发启动激励弹窗', { isFirstPlanDay, hasCompletedOnboarding });
          setShowStartupMotivation(true);
          localStorage.setItem('lastStartupMotivationDate', today);
          
          // 清除新用户标记
          if (newUserEntryDate) {
            localStorage.removeItem('isNewUserFirstEntry');
          }
          return;
        }
        
        // 检查每日登录经验值奖励（每天只奖励一次）
        const lastLoginDate = localStorage.getItem('lastLoginDate');
        if (lastLoginDate !== today) {
          // 今日首次登录，给予经验值奖励
          const loginExp = LevelManager.calculateDailyLoginExp();
          await addUserExp(loginExp); // 使用 Hook 自动保存到数据库
          localStorage.setItem('lastLoginDate', today);
          console.log('📈 每日登录经验值奖励', { exp: loginExp, total: userExp + loginExp });
          // userLevel 会自动同步
        }
        
        // 🆕 周报自动生成（基于注册日锚点，每7天一次）
        const checkAndGenerateWeeklyReport = async () => {
          try {
            const response = await fetch('/api/weekly-report/auto', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            
            if (!response.ok) {
              console.warn('周报自动检查失败:', response.status);
              return;
            }
            
            const data = await response.json();
            
            if (data.shouldSend && data.mail) {
              const mailSystem = MailSystem.getInstance();
              await mailSystem.refresh();
              console.log('✅ 周报邮件已添加到信箱', data.period);
            } else {
              console.log('ℹ️ 暂不需要生成周报', {
                nextSendAt: data.nextSendAt,
                anchorStart: data.anchorStart,
              });
            }
          } catch (error) {
            console.error('❌ 周报自动生成失败:', error);
          }
        };
        
        // 执行周报检查（异步，不阻塞页面）
        checkAndGenerateWeeklyReport();

        // 🔄 邮件补发（非周报）
        const backfillMails = async () => {
          try {
            const response = await fetch('/api/mails/backfill', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            if (response.ok) {
              // 刷新邮件系统，更新未读计数
              await refreshMails();
              console.log('✅ 邮件补发完成，未读计数已更新');
            } else {
              console.warn('邮件补发失败:', response.status);
            }
          } catch (error) {
            console.error('❌ 邮件补发异常:', error);
          }
        };

        backfillMails();
        
        const remoteSpiritState = await loadSpiritDialogState();
        const lastWelcomeDate = remoteSpiritState?.lastWelcomeDate ?? localStorage.getItem('lastWelcomeDate');

        // 构造首页状态快照（EchoHomeStatus）
        const hasFocusToday = todayStats.minutes > 0;
        const minFocusReachedToday = todayStats.minutes >= MIN_FOCUS_MINUTES;
        const hasCompletedSessionToday = minFocusReachedToday; // 暂以达标视为“至少完成一次完整专注”

        const status: EchoHomeStatus = {
          hasFocusToday,
          minFocusReachedToday,
          hasCompletedSessionToday,
          isFirstVisitToday: lastWelcomeDate !== today,
          hasShownMinFocusFirstToday:
            localStorage.getItem('minFocusFirstShownDate') === today,
          hasShownAfterFocusFirstToday:
            localStorage.getItem('afterFocusFirstShownDate') === today,
          hasShownIdleFirstToday: lastWelcomeDate === today ? true : false,
          streakDays: stats.streakDays,
          isStreak7Today:
            stats.streakDays === 7 &&
            localStorage.getItem('streak7ShownDate') !== today,
        };

        const hasAnyEventOrFirstVisit =
          status.isFirstVisitToday || status.isStreak7Today;

        // 🚨 刚专注完成的绝对优先文案：阻止任何其他首页文案插队
        const justCompletedAt = localStorage.getItem(JUST_COMPLETED_FOCUS_FLAG);
        const isRecentlyCompleted =
          justCompletedAt &&
          Date.now() - new Date(justCompletedAt).getTime() < 5 * 60 * 1000;

        if (isRecentlyCompleted && spiritDialogRef.current) {
          const { text } = pickSentenceFromPool('after_focus_first');
          // @ts-ignore
          spiritDialogRef.current.showTypedMessage?.(text, 'cute');
          localStorage.removeItem(JUST_COMPLETED_FOCUS_FLAG);
          localStorage.setItem('afterFocusFirstShownDate', today);
          localStorage.setItem('lastWelcomeDate', today);
          persistSpiritDialogState({ lastWelcomeDate: today });
          return;
        }

        // ① 今日首次进入主页：按照语境必说话
        if (hasAnyEventOrFirstVisit) {
          const { text, pool } = pickHomeSentence({ status });
          if (spiritDialogRef.current && text) {
            // 使用通用 cute 样式展示首页欢迎/语境文案
            // @ts-ignore: 扩展的 ref 方法在运行时已存在
            spiritDialogRef.current.showTypedMessage?.(text, 'cute');

            // 根据实际使用的语境池记录当日标记，避免重复触发“首次”类文案
            if (pool === 'idle_first') {
              localStorage.setItem('lastWelcomeDate', today);
              persistSpiritDialogState({ lastWelcomeDate: today });
            }
            if (pool === 'min_focus_first') {
              localStorage.setItem('minFocusFirstShownDate', today);
            }
            if (pool === 'after_focus_first') {
              localStorage.setItem('afterFocusFirstShownDate', today);
            }
            if (pool === 'streak7_event') {
              localStorage.setItem('streak7ShownDate', today);
              localStorage.setItem('lastWelcomeDate', today);
              persistSpiritDialogState({ lastWelcomeDate: today });
            }
          }
          return;
        }

        // ② 非首次进入主页：25% 频率层逻辑（无事件时）
        const r = Math.random();
        if (r < 0.25 && spiritDialogRef.current) {
          const { text } = pickUniversalSentence();
          // @ts-ignore
          spiritDialogRef.current.showTypedMessage?.(text, 'cute');
        }
      }, 800); // 延迟800ms确保页面渲染完成
    }
  }, [authKey]);

  // ============================================
  // 空闲鼓励触发逻辑（上线1分钟后未开始专注时轻引导）
  // - 优先级：AUTO_DIALOGUE (100)
  // - 不会抢占每日欢迎（DAILY_WELCOME = 500）
  // - 每天只触发一次
  // ============================================
  useEffect(() => {
    if (typeof window === 'undefined' || !spiritDialogRef.current) return;

    const today = getTodayDate();
    const idleEncourageShownDate = localStorage.getItem('idleEncourageShownDate');
    
    // 如果今天已经触发过，跳过
    if (idleEncourageShownDate === today) {
      return;
    }

    // 记录页面加载时的今日专注时长
    const initialTodayMinutes = todayStats.minutes;
    
    // 1分钟后检查是否开始专注
    const timer = setTimeout(() => {
      // 重新获取当前的今日专注时长
      const currentTodayStats = (() => {
        try {
          const data = getUserStorage('todayStats');
          if (!data) return { minutes: 0, date: today };
          const parsed = JSON.parse(data);
          const todayData = parsed[today];
          return todayData || { minutes: 0, date: today };
        } catch {
          return { minutes: 0, date: today };
        }
      })();

      // 如果专注时长有增加，说明用户已经开始专注，不触发
      if (currentTodayStats.minutes > initialTodayMinutes) {
        return;
      }

      // 如果用户还没有开始专注，触发空闲鼓励文案
      if (spiritDialogRef.current) {
        const { text } = pickEventSentence('idle_encourage_event' as EchoEventKey);
        if (text) {
          // @ts-ignore: 扩展的 ref 方法在运行时已存在
          spiritDialogRef.current.showTypedMessage?.(text, 'cute');
          // 记录今天已触发，避免重复
          localStorage.setItem('idleEncourageShownDate', today);
        }
      }
    }, 60000); // 60秒 = 1分钟

    return () => clearTimeout(timer);
  }, [authKey, todayStats.minutes]); // 依赖authKey和todayStats.minutes

  // ============================================
  // 深夜在线觉察（22:30 后，用户仍在线则自动触发，最高优先级）
  // - 每个夜晚仅触发一次（22:30 ~ 04:00 视作同一夜晚）
  // - 用户不交互则文案不消失
  // ============================================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!authKey.startsWith('authenticated_')) return;

    const getLateNightKeyDate = (now: Date) => {
      if (now.getHours() < 4) {
        const prev = new Date(now);
        prev.setDate(now.getDate() - 1);
        return prev.toISOString().split('T')[0];
      }
      return now.toISOString().split('T')[0];
    };

    const isAfterLateNight = (now: Date) => {
      const h = now.getHours();
      const m = now.getMinutes();
      return h > 22 || (h === 22 && m >= 30) || h < 4;
    };

    const checkAndTriggerLateNight = () => {
      if (document.visibilityState !== 'visible') return;
      const now = new Date();
      if (!isAfterLateNight(now)) return;

      const keyDate = getLateNightKeyDate(now);
      const shownKey = localStorage.getItem('lateNightAwarenessShownDate');
      if (shownKey === keyDate) return;

      try {
        const ctx = buildLateNightAwarenessContext();
        const response = handleAwarenessEvent(ctx);
        if (response && response.match.ruleId === 'SCENE5_LATE_NIGHT_ONLINE' && response.copy) {
          spiritDialogRef.current?.showAwarenessMessage?.(response.copy, 0);
          localStorage.setItem('lateNightAwarenessShownDate', keyDate);
        }
      } catch (err) {
        console.warn('触发觉察机制时出现问题（LATE_NIGHT）:', err);
      }
    };

    // 初始检查 + 每分钟检查
    checkAndTriggerLateNight();
    const interval = setInterval(checkAndTriggerLateNight, 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndTriggerLateNight();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authKey, buildLateNightAwarenessContext]);

  // ============================================
  // 心流指数说明 - 目前在UI中隐藏，但保留完整逻辑
  // 即使UI隐藏，仍保持所有计算逻辑和算法最新
  // 
  // 数据结构：
  // - flowIndex.score: 总分（0-100）
  // - flowIndex.level: 等级名称（如 初识心流 / 探索心流 / 成长心流 / 稳定心流 / 大师心流）
  // - flowIndex.breakdown: 维度指标
  //   - quality: 专注质量（0-100）
  //   - duration: 专注时长（0-100）
  //   - consistency: 专注习惯（0-100）
  //
  // 如需显示：
  // 1. 将UI区块中的 "hidden" 类移除
  // 2. 立刻即可使用当前实时计算的心流指数
  // ============================================
  const flowIndex = useMemo<FlowIndexResult>(() => {
    if (typeof window === 'undefined') {
      return {
        score: 0,
        level: '萌芽',
        breakdown: {
          quality: 0,
          duration: 0,
          consistency: 0
        }
      };
    }

    const flowData = localStorage.getItem('flowMetrics');
    const metrics = ensureFlowMetricsShape(flowData ? JSON.parse(flowData) : undefined);
    const now = Date.now();
    let mutated = false;
    if (applyTempFlowDecay(metrics, now)) mutated = true;
    if (applyImpressionCooling(metrics, now)) mutated = true;

    const weeklyBehavior = calculateWeeklyBehaviorScore();

    if (mutated) {
      localStorage.setItem('flowMetrics', JSON.stringify(metrics));
    }

    return computeFlowIndex(metrics, weeklyBehavior);
  }, [stats.streakDays, todayStats.minutes, weeklyStats.totalMinutes, totalFocusMinutes]);

  const flowScore = clamp(Math.round(flowIndex.score || 0), 0, 100);
  const flowStage =
    flowScore < 45
      ? '萌芽'
      : flowScore < 60
        ? '扎根'
        : flowScore < 75
          ? '顺流'
          : flowScore < 90
            ? '深流'
            : '澄明';

  // 初始化成就管理器 + 数据完整性检查
  useEffect(() => {
    const manager = getAchievementManager();
    setAchievementManager(manager);
    
    // 启动时进行数据完整性检查和数据库同步
    if (session?.user?.id) {
      console.log('[Dashboard] 开始数据完整性检查...');
      
      // 1. 检查数据完整性（自动恢复丢失的数据）
      checkDataIntegrity(session.user.id).catch(error => {
        console.error('[Dashboard] 数据完整性检查失败:', error);
      });
      
      // 2. 从数据库同步成就数据
      manager.syncFromDatabase().catch(error => {
        console.error('[Dashboard] 成就数据同步失败:', error);
      });
    }
    
    // 检查当前状态的成就
    const flowAchievements = manager.checkFlowIndexAchievements(flowIndex.score);
    
    // 计算总时长成就（累计专注时长）- 使用总专注时长
    const totalHours = Math.floor(totalFocusMinutes / 60);
    const timeAchievements = manager.checkTotalTimeAchievements(totalHours);
    
    // 计算今日时长成就
    const todayHours = todayStats.minutes / 60;
    const dailyAchievements = manager.checkDailyTimeAchievements(todayHours);
    
    // 完成小目标成就
    const milestoneAchievements = manager.checkMilestoneAchievements(stats.completedGoals);
    
    // ✅ 改进：首次成就判定不再依赖 localStorage 标记
    // 改为基于实际数据判断（数据库同步后的成就列表已经包含历史成就）
    
    // 第一次完成专注成就 - 基于实际专注数据判断
    const hasAnyFocus = totalFocusMinutes > 0 || todayStats.minutes > 0;
    const firstFocusAchievement = hasAnyFocus && !manager.hasAchievement('first_focus')
      ? manager.checkFirstTimeAchievements('focus')
      : [];
    
    // 如果成就已解锁，设置防护标记（不再需要清除 localStorage 标记）
    if (firstFocusAchievement.length > 0) {
      setProtectionMarker('first_focus');
    }
    
    // 其他首次成就 - 基于实际数据判断
    // 注意：这些判定会在用户实际执行操作时触发，不需要在这里批量检查
    const firstPlanCreatedAchievement: Achievement[] = [];
    const firstMilestoneCreatedAchievement: Achievement[] = [];
    const firstPlanCompletedAchievement: Achievement[] = [];

    // 特殊时段上线成就（夜猫子 / 晨曦见证者）
    const specialVisitAchievements = manager.checkSpecialVisitAchievements();
    
    const allNew = [
      ...flowAchievements, 
      ...timeAchievements, 
      ...dailyAchievements, 
      ...milestoneAchievements,
      ...firstFocusAchievement,
      ...firstPlanCreatedAchievement,
      ...firstMilestoneCreatedAchievement,
      ...firstPlanCompletedAchievement,
      ...specialVisitAchievements,
    ];
    
    if (allNew.length > 0) {
      setNewAchievements(allNew);
      // 添加到未查看列表
      setUnviewedAchievements(allNew);
      
      // 将未查看成就保存到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('unviewedAchievements', JSON.stringify(allNew));
        // 设置防护标记
        setProtectionMarker('first_achievement');
      }
      
      //  });
      
      // 成就解锁获得经验值（每个成就20 EXP）- 使用异步函数处理
      (async () => {
        if (typeof window !== 'undefined') {
          const achievementExp = LevelManager.calculateAchievementExp('common'); // 常规成就20 EXP
          const totalExpToAdd = achievementExp * allNew.length;
          
          const oldLevel = LevelManager.calculateLevel(userExp);
          await addUserExp(totalExpToAdd); // 使用 Hook 自动保存到数据库
          const newLevel = LevelManager.calculateLevel(userExp + totalExpToAdd);
          setUserLevel(newLevel);
          
          // 同步成就到数据库
          for (const achievement of allNew) {
            await unlockAchievementToDB(achievement.id, achievement.category);
          }
          
          console.log(`🎁 解锁${allNew.length}个成就，获得${achievementExp * allNew.length} EXP`);
          
          if (newLevel.currentLevel > oldLevel.currentLevel) {
            console.log('🎉 等级提升！（成就解锁触发）', newLevel);
          }
          
          // 心树 EXP 系统：成就解锁 → 授予施肥 Buff
          try {
            const state = loadHeartTreeExpState();
            await updateHeartTreeExpState(grantFertilizerBuff(state));
            console.log('🌱 心树获得施肥 Buff！（成就解锁）');
          } catch (e) {
            console.error('成就解锁时授予心树施肥 Buff 失败:', e);
          }
        }
      })();
      
      // 3秒后自动清空，以便再次触发
      setTimeout(() => setNewAchievements([]), 3000);
    }
  }, [flowIndex.score, totalFocusMinutes, weeklyStats.totalMinutes, todayStats.minutes, stats.completedGoals]);
  
  // 从localStorage恢复未查看成就
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
          console.error('恢复未查看成就失败:', e);
        }
      }
    }
  }, []);

  // 恢复并计算用户等级
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // userExp 来自 Hook，会自动同步
    // 此 useEffect 已经被 Hook 的 useEffect 取代，保留空实现避免错误
    if (userExp >= 0) {
      const levelInfo = LevelManager.calculateLevel(userExp);
      setUserLevel(levelInfo);
      console.log('📊 用户等级信息', levelInfo);
    }
  }, [todayStats.minutes, weeklyStats.totalMinutes, stats.streakDays]);

  // 检查是否达到每日目标并给予奖励
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!primaryPlan) return;
    
    const todayGoal = primaryPlan.dailyGoalMinutes || 0;
    if (todayGoal <= 0) return;
    
    const progress = todayStats.minutes / todayGoal;
    if (progress >= 1) {
      // 心树功能暂时屏蔽
      // const { HeartTreeManager } = require('./HeartTreeSystem');
      // 达成100%目标：触发一次浇水和一次施肥
      // HeartTreeManager.addRewardOnGoalComplete();
      // 达成每日目标：触发一次施肥机会
      // HeartTreeManager.addFertilizeOpportunityOnDailyGoalComplete();
    }
  }, [primaryPlan, todayStats.minutes]);

  // 如果专注在其他页面完成，回到dashboard也要提示
  // 通过监听可见性事件，确保hooks只触发一次
  useEffect(() => {
    const checkFocusCompleted = () => {
      // 仅在页面可见且不在loading状态时执行
      if (document.visibilityState === 'visible' && !isLoading) {
        const focusCompleted = localStorage.getItem('focusCompleted');
        if (focusCompleted === 'true') {
          // 延迟一点时间显示祝贺，确保页面渲染完成
          setTimeout(() => {
            if (spiritDialogRef.current) {
              spiritDialogRef.current.showCompletionMessage();
              // 播放完后清除标记
              localStorage.removeItem('focusCompleted');
            }
          }, 500);
          return;
        }

        const focusEndReason = localStorage.getItem('focusEndReason');
        if (focusEndReason && spiritDialogRef.current) {
          const pool =
            focusEndReason === 'agitated_end'
              ? FOCUS_END_AGITATED_MESSAGES
              : FOCUS_END_EARLY_MESSAGES;
          const text = pickRandomFromPool(pool);
          if (text) {
            spiritDialogRef.current.showTypedMessage?.(text, 'philosophical');
          }
          localStorage.removeItem('focusEndReason');
        }
      }
    };

    // 初始化
    checkFocusCompleted();

    // 监听页面可见性变化，例如切换回dashboard时
    document.addEventListener('visibilitychange', checkFocusCompleted);

    return () => {
      document.removeEventListener('visibilitychange', checkFocusCompleted);
    };
  }, [isLoading]);

  // 点击外部关闭tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-tooltip-trigger]')) {
        setShowWeeklyInfo(false);
        setShowStreakInfo(false);
        setShowFlowInfo(false);
      }
    };

    if (showWeeklyInfo || showStreakInfo || showFlowInfo) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showWeeklyInfo, showStreakInfo, showFlowInfo]);

  // UI 辅助函数 - 进度颜色
  const getProgressColor = (progress: number): string => {
    if (progress < 0.33) return '#ef4444'; // 红色 - 未达标
    if (progress < 1) return '#eab308';    // 金色 - 接近目标
    return '#22c55e';                      // 绿色 - 已完成
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '早安';
    if (hour >= 12 && hour < 18) return '午后好';
    return '夜深了';
  };
  
  // 获取用户名 - 优先使用 session 的名称
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || '小伙伴';

  // 处理“开始专注”按钮
  const handleStartFocus = () => {
    router.push('/focus');
  };

  // 调试：输出主题信息
  useEffect(() => {
    console.log('[Dashboard] 主题状态更新:', theme);
    console.log('[Dashboard] themeConfig:', getThemeConfig(theme));
  }, [theme]);

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

  // 进度数据 - 今日专注百分比 = 今日专注/日目标
  const todayGoal = primaryPlan?.dailyGoalMinutes || 0;
  // 使用 primaryPlan.dailyGoalMinutes 作为当前 goal
  const progress = todayGoal > 0 ? Math.min(1, todayStats.minutes / todayGoal) : 0;
  const progressColor = getProgressColor(progress);
  const greeting = getGreeting();

  // 成就通知
  const AchievementNotification = () => {
    if (newAchievements.length === 0) return null;

    return (
      <div className="fixed top-4 right-4 z-50 space-y-2">
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

  // 计算当前小精灵状态（用于对话框）
  // 即使完成100%也保持idle，点击时随机播放happy或excited
  const effectiveSpiritState = 'idle';

  const planMilestones = primaryPlan?.milestones ?? [];
  const allActiveMilestones = planMilestones.filter((milestone) => !milestone.isCompleted); // 只显示未完成的小目标
  
  // 🌟 读取优先级小目标，优先显示在前三个位置
  const priorityMilestoneIds = (() => {
    if (!primaryPlan?.id || typeof window === 'undefined') return [];
    try {
      const savedPriority = localStorage.getItem(`plan_${primaryPlan.id}_priority_milestones`);
      if (savedPriority) {
        const ids: string[] = JSON.parse(savedPriority);
        // 验证这些ID是否仍然存在于当前里程碑中
        return ids.filter((id: string) => 
          allActiveMilestones.some(m => m.id === id)
        ).slice(0, 3);
      }
    } catch (e) {
      console.error('读取优先级失败:', e);
    }
    return [];
  })();
  
  // 重新排序：优先级在前，其他在后
  const activeMilestones = [
    ...priorityMilestoneIds
      .map(id => allActiveMilestones.find(m => m.id === id))
      .filter(Boolean) as typeof allActiveMilestones,
    ...allActiveMilestones.filter(m => !priorityMilestoneIds.includes(m.id))
  ];
  
  const completedMilestones = planMilestones.filter((milestone) => milestone.isCompleted).length;
  const planProgressPercent = planMilestones.length > 0 ? Math.round((completedMilestones / planMilestones.length) * 100) : 0;
  const totalFocusHours = Math.floor(totalFocusMinutes / 60);
  const totalFocusMinutesRemainder = Math.floor(totalFocusMinutes % 60);
  const weeklyHours = Math.floor(weeklyStats.totalMinutes / 60);
  const weeklyMinutesRemainder = weeklyStats.totalMinutes % 60;
  const statsGridColumns = 'grid-cols-2 md:grid-cols-4';

  const FocusDial = ({ size = 192 }: { size?: number }) => {
    const stroke = 8;
    const radius = size / 2;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 border border-zinc-200/60 rounded-full" />
        <div
          className="absolute inset-0 border border-emerald-200/50 rounded-full scale-110 border-dashed animate-spin"
          style={{ animationDuration: '12s' }}
        />
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90 drop-shadow-[0_0_15px_rgba(16,185,129,0.25)]"
        >
          <circle
            stroke="#e4e4e7"
            strokeWidth={stroke}
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke="#10b981"
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-4xl font-bold text-zinc-900">{percentage}%</p>
          <p className="text-xs uppercase tracking-[0.35em] text-teal-500 font-medium mt-1">Today</p>
        </div>
      </div>
    );
  };

  // 商城卡片组件
  const ShopCard = () => {
    // 获取果实数据
    useEffect(() => {
      if (session?.user?.id) {
        fetch('/api/user/fruits')
          .then(res => res.json())
          .then(data => {
            if (data.fruits !== undefined) {
              setFruits(data.fruits);
            }
          })
          .catch(err => console.error('获取果实数据失败:', err));
      }
    }, [session?.user?.id]);

    return (
      <div 
        onClick={() => setShowShopModal(true)}
        className="bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500 rounded-3xl p-6 shadow-lg shadow-orange-500/30 text-white hover:scale-[1.02] transition-all duration-300 cursor-pointer relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="text-6xl">🏪</span>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/80 font-medium">心树商城</p>
          <span className="text-2xl">🛍️</span>
        </div>
        
        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">🍎</span>
            <div>
              <p className="text-sm text-white/80">我的果实</p>
              <p className="text-3xl font-bold">{fruits}</p>
            </div>
          </div>
          <p className="text-sm text-white/90">
            点击进入商城，兑换精美道具
          </p>
        </div>
      </div>
    );
  };
  const renderPlanDetails = () => {
    if (!primaryPlan) {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Focus Plan</p>
            <h3 className="text-2xl font-semibold text-zinc-900 mt-2">暂无主要计划</h3>
          </div>
          <p className="text-sm text-zinc-500">
            创建一个主要计划来承载你的专注目标。
          </p>
          <button
            onClick={() => router.push('/plans')}
            className="w-full px-5 py-3 rounded-2xl bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-all"
          >
            新建计划
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500">当前计划</p>
            <h3 className="text-2xl font-semibold text-zinc-900 mt-1">{primaryPlan.name}</h3>
          </div>
          <span className="text-xs text-zinc-400">{planProgressPercent}%</span>
        </div>

        <div className="space-y-3">
          {activeMilestones.length === 0 && planMilestones.length === 0 && (
            <p className="text-sm text-zinc-500">还没有小目标，去添加一个小目标吧。</p>
          )}
          {activeMilestones.length === 0 && planMilestones.length > 0 && (
            <p className="text-sm text-emerald-600 font-medium">🎉 所有小目标已完成！</p>
          )}
          {activeMilestones.map((milestone, index) => {
            const isSelected = selectedMilestoneIds.has(milestone.id);
            const isCompleting = completingMilestoneId === milestone.id;
            const isGoalOfTheDay = selectedGoalMilestoneId === milestone.id;
            const isLast = index === activeMilestones.length - 1;
            return (
              <div 
                key={milestone.id} 
                className={`space-y-2 transition-all duration-500 relative ${
                  isCompleting ? 'opacity-0 transform scale-95' : 'opacity-100'
                }`}
              >
                {/* 今日目标标记 */}
                {isGoalOfTheDay && (
                  <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs px-2 py-1 rounded-full shadow-lg flex items-center gap-1 animate-bounce-gentle">
                    <span>⭐</span>
                    <span className="font-semibold">今日目标</span>
                  </div>
                )}
                
                <button
                  onClick={() => handleMilestoneToggle(milestone.id)}
                  disabled={isCompleting}
                  className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
                    isGoalOfTheDay
                      ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-400 animate-breathing'
                      : isCompleting
                      ? 'bg-emerald-50 border-emerald-200'
                      : isSelected
                      ? 'bg-emerald-50 border-emerald-300 hover:border-emerald-400'
                      : 'bg-white border-zinc-100 hover:border-emerald-200 hover:bg-zinc-50'
                  }`}
                >
                  <span className={`text-sm font-medium transition-all duration-300 ${
                    isCompleting 
                      ? 'text-emerald-700 line-through decoration-emerald-500 decoration-2' 
                      : isSelected
                      ? 'text-emerald-700'
                      : 'text-zinc-700'
                  }`}>
                    {milestone.title}
                  </span>
                  <span className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 ${
                    isCompleting
                      ? 'bg-emerald-500 border-emerald-500 text-white scale-110'
                      : isSelected
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-zinc-100 border-zinc-200 text-zinc-400'
                  }`}>
                    {isSelected || isCompleting ? '✓' : ''}
                  </span>
                </button>
                {/* 在最后一个小目标下显示完成/取消按钮 */}
                {isLast && selectedMilestoneIds.size > 0 && (
                  <div className="flex gap-2 px-4 animate-fade-in">
                    <button
                      onClick={confirmMilestoneComplete}
                      className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-sm font-medium transition-all shadow-lg shadow-teal-500/30"
                    >
                      完成 ({selectedMilestoneIds.size})
                    </button>
                    <button
                      onClick={cancelMilestoneSelection}
                      className="flex-1 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium transition-all"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {planMilestones.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span>进度</span>
              <span>{planProgressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                style={{ width: `${planProgressPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-200 space-y-3">
          {/* 两个并排按钮：快速开始/快速启动 和 添加小目标 */}
          <div className="flex gap-3">
            <button
              onClick={handleQuickStartFromMotivation}
              className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${
                selectedGoalMilestoneId && todayStats.minutes === 0
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 animate-pulse-gentle'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {selectedGoalMilestoneId && todayStats.minutes === 0
                ? `快速启动（${primaryPlan?.dailyGoalMinutes || 15}分钟）`
                : '快速开始'}
            </button>
            <button
              onClick={() => {
                if (primaryPlan) {
                  setShowGoalInputModal(true);
                } else {
                  router.push('/plans');
                }
              }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加小目标
            </button>
          </div>
        </div>

      </>
    );
  };

  // 简单的loading检查（不阻塞，快速显示）
  if (isLoading) {
    return null; // 或者显示一个极简的loading，但通常会很快通过
  }

  const themeConfig = getThemeConfig(theme);
  
  return (
    <>
      <Head>
        <title>Echo回心 | Echo</title>
      </Head>
      <div 
        className={`min-h-screen text-zinc-900 relative pb-24 transition-all duration-500 ${theme !== 'default' ? 'animate-breathing-bg' : ''}`}
        style={{
          backgroundColor: themeConfig.bgColor,
          ...(themeConfig.bgStyle || {}),
        }}
      >
        {/* 季节主题的场景动画层 */}
        {['spring', 'summer', 'autumn', 'winter'].includes(theme) && (
          <div className={`season-overlay season-${theme}`} aria-hidden="true">
            {Array.from({ length: theme === 'summer' ? 16 : 12 }).map((_, index) => (
              <span
                key={index}
                className="season-particle"
                style={{
                  left: `${5 + (index * 8) % 90}%`,
                  width: `${theme === 'summer' ? 10 + (index % 4) * 5 : 6 + (index % 3) * 3}px`,
                  height: `${theme === 'summer' ? 10 + (index % 4) * 5 : 8 + (index % 3) * 3}px`,
                  animationDelay: `${index * 0.8}s`,
                  animationDuration: `${theme === 'summer' ? 9 + (index % 4) * 2.2 : 8 + (index % 4) * 2}s`,
                }}
              />
            ))}
          </div>
        )}
        {/* 成就通知 */}
        <AchievementNotification />
      
      {/* 小精灵对话 */}
      <SpiritDialog
        ref={spiritDialogRef}
        spiritState={effectiveSpiritState}
        onStateChange={(newState) => {
          setCurrentSpiritState(newState);
        }}
        onCueStart={(cue) => {
          if (cue.source !== 'click') {
            triggerAutoSpiritAnimation(cue.animation, 2000);
          }
        }}
        initialPeriodicTimestamp={initialPeriodicTimestamp ?? undefined}
        onPeriodicMessageShown={(timestamp) => {
          const iso = new Date(timestamp).toISOString();
          localStorage.setItem('lastPeriodicSpiritAt', iso);
          persistSpiritDialogState({ lastPeriodicSpiritAt: iso });
        }}
        mobileContainerClassName="sm:hidden fixed pointer-events-none w-[220px] max-w-[220px] z-50"
        mobileContainerStyle={{ bottom: '15.5rem', right: '-1.6rem' }}
      />

      {/* 新版布局 - 顶部导航栏仅在dashboard页面显示 */}
      {router.pathname === '/dashboard' && (
        <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-white/70 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-400">Echo Focus</p>
              <p className="text-lg font-semibold">{greeting}，{userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQuickSearchGuide(true)}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition"
              title="快速查找"
            >
              <span className="text-2xl">🔍</span>
            </button>
            <button
              onClick={() => setShowAchievementPanel(true)}
              className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 text-white flex items-center justify-center shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition"
            >
              <span className="text-2xl">🏆</span>
              {unviewedAchievements.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
                  {unviewedAchievements.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowMailPanel(true)}
              className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition"
              title="收件箱"
            >
              <span className="text-2xl">📬</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <UserMenu
              userInitial={session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'}
            />
          </div>
        </div>
      </nav>
      )}

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-10">
        
        {/* =========================================================
            MOBILE LAYOUT (lg:hidden) - 手机端专属布局
           ========================================================= */}
        <div className="lg:hidden space-y-6">
          {/* 1. 今日节奏卡片 (Mobile) */}
          <div className="bg-white/80 border border-white/60 rounded-3xl p-6 shadow-sm relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs uppercase tracking-[0.4em] text-teal-500 font-medium">今日节奏</p>
                
                {/* 移动端环形图 - 今日专注时长进度 */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="relative w-12 h-12">
                    <svg className="transform -rotate-90 w-full h-full">
                      <circle
                        stroke="#e4e4e7"
                        strokeWidth="4"
                        fill="transparent"
                        r="20"
                        cx="24"
                        cy="24"
                      />
                      <circle
                        stroke={progressColor}
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 20} ${2 * Math.PI * 20}`}
                        strokeDashoffset={2 * Math.PI * 20 * (1 - Math.min(1, progress))}
                        strokeLinecap="round"
                        r="20"
                        cx="24"
                        cy="24"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-zinc-700">{Math.round(progress * 100)}%</span>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400">今日目标</span>
                </div>
              </div>
            </div>
            
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-2">
              {progress >= 1 
                ? '今天的时间，已经被你夺回。' 
                : todayStats.minutes > 0 && todayStats.minutes < (primaryPlan?.dailyGoalMinutes || 0)
                  ? '状态绝佳！有没有兴趣再专注一把？'
                  : '欢迎回来，让我们坐下来，准备好今天做什么了吗？'
              }
            </h1>
            <p className="text-sm text-zinc-500 mb-6">
              今日专注 {todayStats.minutes} 分钟 / 目标 {todayGoal || '—'} 分钟
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleStartFocus}
                className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-medium hover:from-teal-600 hover:to-cyan-600 transition shadow-lg shadow-teal-500/30"
              >
                开始专注
              </button>
              
              {/* 🌟 节奏设定按钮 - 与开始专注按钮大小一致 */}
              <button
                onClick={() => setShowStartupMotivation(true)}
                className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-sm font-medium hover:from-amber-600 hover:to-yellow-600 transition shadow-lg shadow-amber-500/30"
                title="节奏设定"
              >
                节奏设定
              </button>
            </div>
          </div>

          {/* 2. 计划 Check 卡片 (Mobile) */}
          <div className="bg-white/90 border border-white/70 rounded-3xl p-6 shadow-lg shadow-emerald-100/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-1">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-teal-500">当前计划</p>
                  <h3 className="text-xl font-semibold text-zinc-900 mt-1">
                    {primaryPlan ? primaryPlan.name : '暂无主要计划'}
                  </h3>
                </div>
              </div>
              <span className="text-xs text-zinc-400">{planProgressPercent}%</span>
            </div>
            
            {primaryPlan ? (
              <>
                <div className="space-y-3 mb-4">
                  {activeMilestones.length === 0 && planMilestones.length === 0 && (
                    <p className="text-sm text-zinc-500">还没有小目标，去添加一个小目标吧。</p>
                  )}
                  {activeMilestones.length === 0 && planMilestones.length > 0 && (
                    <p className="text-sm text-emerald-600 font-medium">🎉 所有小目标已完成！</p>
                  )}
                  {activeMilestones.slice(0, 3).map((milestone) => {
                    const isSelected = selectedMilestoneIds.has(milestone.id);
                    const isCompleting = completingMilestoneId === milestone.id;
                    return (
                      <button
                        key={milestone.id}
                        onClick={() => handleMilestoneToggle(milestone.id)}
                        disabled={isCompleting}
                        className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
                          isCompleting
                            ? 'bg-emerald-50 border-emerald-200'
                            : isSelected
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-white border-zinc-100'
                        }`}
                      >
                        <span className={`text-sm font-medium ${
                          isCompleting ? 'text-emerald-700 line-through' : isSelected ? 'text-emerald-700' : 'text-zinc-700'
                        }`}>
                          {milestone.title}
                        </span>
                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                          isSelected || isCompleting ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-zinc-50 border-zinc-200'
                        }`}>
                          {isSelected || isCompleting ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                  {activeMilestones.length > 3 && (
                    <p className="text-xs text-center text-zinc-400">还有 {activeMilestones.length - 3} 个小目标</p>
                  )}
                </div>
                
                {selectedMilestoneIds.size > 0 && (
                  <div className="flex gap-2 mb-4 animate-fade-in">
                    <button
                      onClick={confirmMilestoneComplete}
                      className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-medium shadow-lg shadow-teal-500/30"
                    >
                      完成 ({selectedMilestoneIds.size})
                    </button>
                    <button
                      onClick={cancelMilestoneSelection}
                      className="flex-1 px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-medium"
                    >
                      取消
                    </button>
                  </div>
                )}

                {primaryPlan.finalGoal && (
                  /* 移动端里程碑信息已移动到独立卡片 */
                  null
                )}
              </>
            ) : (
              <button
                onClick={() => router.push('/plans')}
                className="w-full px-5 py-3 rounded-2xl bg-zinc-900 text-white font-medium"
              >
                新建计划
              </button>
            )}
          </div>

          {/* 3. 数据统计行 (Mobile) */}
          <div className="xl:hidden space-y-4">
            {/* 第一行：等级 & 本周 */}
            <div className="flex gap-4">
              {userLevel && (
                <div className="flex-1 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-[2rem] p-5 text-white shadow-lg flex flex-col justify-between aspect-[4/3]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl animate-pulse">⭐</span>
                    <p className="text-2xl font-bold">LV.{userLevel.currentLevel}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-white/90 leading-tight line-clamp-1">{userLevel.title}</p>
                    <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-700 ease-out"
                        style={{ width: `${userLevel.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex-1 bg-white/90 backdrop-blur-sm border-2 border-white/80 rounded-[2rem] p-5 shadow-lg flex flex-col justify-between aspect-[4/3]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-teal-500 font-medium">本周</p>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-2xl font-bold text-zinc-900 leading-none">
                    {weeklyHours}h<span className="text-sm font-medium text-zinc-400">{weeklyMinutesRemainder}m</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 第二行：Echo陪伴 & 今日小结 */}
            <div className="flex gap-4">
              <div className="flex-[2] bg-white/90 backdrop-blur-sm border-2 border-emerald-50 rounded-[2rem] p-5 shadow-lg flex flex-col justify-between aspect-[4/3]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-teal-500 font-medium">Echo陪伴</p>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-3xl font-bold text-zinc-900 leading-none">{stats.echoCompanionDays ?? 0}<span className="text-sm text-zinc-500 ml-1">天</span></p>
                </div>
                <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden mt-auto">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full w-1/2"></div>
                </div>
              </div>

              <div className="flex-[3]">
                <TodaySummaryCard
                  userId={session?.user?.id || ''}
                  hasFocusOverride={todayStats.minutes > 0}
                />
              </div>
            </div>
          </div>

          {/* 4. 心流 & 成就 (Mobile) */}
          <div className="space-y-6">
            {/* 移动端日历卡片 */}
            <CalendarCard userId={session?.user?.id} />

            <ShopCard />
            <AchievementsSection />
          </div>
        </div>


        {/* =========================================================
            DESKTOP LAYOUT (hidden lg:block) - PC端恢复原版布局
           ========================================================= */}
        <div className="hidden lg:grid grid-cols-[320px_1fr] gap-8">
          {/* PC - 左侧栏 */}
          <div className="space-y-6">
            <div className="bg-white/80 border border-white/60 rounded-3xl p-6 pb-32 shadow-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer relative">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.4em] text-teal-500 font-medium">今日节奏</p>
                <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
                  {progress >= 1 
                    ? '今天的时间，已经被你夺回。' 
                    : todayStats.minutes > 0 && todayStats.minutes < (primaryPlan?.dailyGoalMinutes || 0)
                      ? '状态绝佳！有没有兴趣再专注一把？'
                      : '让我们坐下来，准备好开始了吗？'
                  }
                </h1>
                <p className="text-sm text-zinc-500">
                  今日专注 {todayStats.minutes} 分钟 / 目标 {todayGoal || '—'} 分钟
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleStartFocus}
                    className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-medium hover:from-teal-600 hover:to-cyan-600 transition shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50"
                  >
                    开始专注
                  </button>
                  
                  {/* 🌟 节奏设定按钮 - 与开始专注按钮大小一致 */}
                  <button
                    onClick={() => setShowStartupMotivation(true)}
                    className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-sm font-medium hover:from-amber-600 hover:to-yellow-600 transition shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50"
                    title="节奏设定"
                  >
                    节奏设定
                  </button>
                </div>
              </div>
              {/* 小精灵 */}
              <div className="absolute pointer-events-none" style={{ bottom: '16px', left: '50%', transform: 'translateX(-50%)' }}>
                <div className="pointer-events-auto">
                  <EchoSpirit
                    state="idle"
                    onStateChange={(newState) => {
                      if (newState === 'idle' || newState === 'happy' || newState === 'excited') {
                        setCurrentSpiritState(newState as 'idle' | 'happy' | 'excited');
                      }
                    }}
                    autoAnimation={autoSpiritAnimation ?? undefined}
                    onClick={handleSpiritClick}
                  />
                </div>
              </div>
            </div>
            <CalendarCard userId={session?.user?.id} />
            <ShopCard />
          </div>

          {/* PC - 右侧内容区 */}
          <div className="hidden xl:flex flex-col gap-6">
            {/* 顶部：数据网格 (4列) */}
            <div className="grid gap-5 grid-cols-4">
              {/* 1. 等级卡片 */}
              {userLevel && (
                <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-[2rem] p-8 text-white shadow-2xl shadow-purple-500/30 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 hover:shadow-purple-500/50 cursor-pointer aspect-square">
                  <div className="flex items-start justify-between">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/70 font-medium">当前等级</p>
                    <span className="text-3xl animate-pulse">⭐</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-5xl font-bold">LV.{userLevel.currentLevel}</p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-white/90 leading-tight">{userLevel.title}</p>
                    <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-700 ease-out"
                        style={{ width: `${userLevel.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/80 font-medium">
                      {userLevel.currentExp} / {userLevel.nextLevelExp} EXP
                    </p>
                  </div>
                </div>
              )}

              {/* 2. 心流指数 */}
              <div className="relative overflow-hidden rounded-[2rem] p-8 text-white shadow-2xl shadow-fuchsia-500/25 flex flex-col justify-between gap-3 hover:scale-[1.02] transition-all duration-300 cursor-pointer aspect-square bg-gradient-to-br from-[#312e81] via-[#7c3aed] to-[#ec4899]">
                <div className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-cyan-200/25 blur-3xl" />
                <div className="flex items-start justify-between">
                  <p className="text-xs uppercase tracking-[0.4em] text-white/80 font-medium">心流指数</p>
                  <button
                    onClick={() => setShowFlowInfo(!showFlowInfo)}
                    data-tooltip-trigger
                    className="relative z-10 w-5 h-5 rounded-full bg-white/30 hover:bg-white/45 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-white">!</span>
                  </button>
                </div>
                {showFlowInfo && (
                  <div data-tooltip-trigger className="absolute top-12 right-0 bg-white rounded-xl p-3 shadow-xl border border-zinc-200 z-50 max-w-[220px]">
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      心流指数由专注质量、时长与稳定性综合计算，分数越高代表状态越稳。
                    </p>
                    <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-zinc-200 transform rotate-45"></div>
                  </div>
                )}
                <div className="relative z-10 flex-1 flex items-center">
                  <div>
                    <p className="text-5xl font-bold leading-none">{flowScore}</p>
                    <p className="text-sm text-white/85 mt-2">{flowStage}</p>
                  </div>
                </div>
                <div className="relative z-10 h-1.5 w-full bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-200 via-fuchsia-100 to-white transition-all duration-700 ease-out"
                    style={{ width: `${flowScore}%` }}
                  />
                </div>
              </div>

              {/* 3. 今日小结 */}
              <div className="aspect-square [&>*]:h-full">
                <TodaySummaryCard
                  userId={session?.user?.id || ''}
                  hasFocusOverride={todayStats.minutes > 0}
                />
              </div>

              {/* 4. 数据卡片（本周专注 + Echo陪伴） */}
              <div className="bg-white/90 backdrop-blur-sm border-2 border-white/80 rounded-[2rem] px-6 py-5 shadow-xl shadow-emerald-100/50 flex flex-col gap-2 relative hover:scale-[1.02] transition-all duration-300 cursor-pointer aspect-square">
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between">
                    <p className="text-xs uppercase tracking-[0.3em] text-teal-500 font-medium">本周专注</p>
                    <button
                      onClick={() => setShowWeeklyInfo(!showWeeklyInfo)}
                      data-tooltip-trigger
                      className="w-5 h-5 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-zinc-600">!</span>
                    </button>
                  </div>
                  {showWeeklyInfo && (
                    <div data-tooltip-trigger className="absolute top-12 right-0 bg-white rounded-xl p-3 shadow-xl border border-zinc-200 z-50 max-w-[220px]">
                      <p className="text-xs text-zinc-600 leading-relaxed">
                        本周专注时长按照时区每周一00:00刷新。
                      </p>
                      <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-zinc-200 transform rotate-45"></div>
                    </div>
                  )}
                  <p className="text-3xl font-bold text-zinc-900 leading-tight">
                    {weeklyHours}h<span className="text-lg text-zinc-500">{weeklyMinutesRemainder}m</span>
                  </p>
                </div>

                <div className="h-px w-full bg-zinc-100 my-0.5" />

                <div className="space-y-1.5">
                  <div className="flex items-start justify-between">
                    <p className="text-xs uppercase tracking-[0.3em] text-teal-500 font-medium">Echo陪伴</p>
                    <button
                      onClick={() => setShowStreakInfo(!showStreakInfo)}
                      data-tooltip-trigger
                      className="w-5 h-5 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-zinc-600">!</span>
                    </button>
                  </div>
                  {showStreakInfo && (
                    <div data-tooltip-trigger className="absolute top-[58%] right-0 bg-white rounded-xl p-3 shadow-xl border border-zinc-200 z-50 max-w-[220px]">
                      <p className="text-xs text-zinc-600 leading-relaxed">
                        你在Echo停靠过的天数（累积+1）
                      </p>
                      <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-zinc-200 transform rotate-45"></div>
                    </div>
                  )}
                  <p className="text-3xl font-bold text-zinc-900 leading-tight">
                    {stats.echoCompanionDays ?? 0}<span className="text-lg text-zinc-500 ml-1">天</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 底部：计划详情大卡片 */}
            <div className="bg-white/90 border border-white/70 rounded-3xl p-6 shadow-lg shadow-emerald-100/40 hover:scale-[1.02] transition-all duration-300 cursor-pointer">
              <div className="flex flex-row gap-8">
                <div className="flex flex-col items-center justify-center">
                  <FocusDial size={200} />
                  <p className="mt-4 text-xs uppercase tracking-[0.35em] text-teal-500">完成进度</p>
                </div>
                <div className="flex-1 space-y-4">
                  {renderPlanDetails()}
                </div>
              </div>
            </div>

            {/* 成就部分 */}
            <AchievementsSection />
          </div>
        </div>
      </main>

      <div className="sm:hidden fixed bottom-28 right-6 z-20">
        <EchoSpiritMobile
          state={currentSpiritState}
          allowFocus={false}
          isCompleted={progress >= 1}
          autoAnimation={autoSpiritAnimation ?? undefined}
          onStateChange={(newState) => {
            if (newState === 'focus') {
              setCurrentSpiritState('idle');
            } else {
              setCurrentSpiritState(newState);
            }
          }}
          onClick={handleSpiritClick}
        />
      </div>

      <BottomNavigation active="home" hasFocusedToday={todayStats.minutes > 0} />
      
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

      {/* 邮件面板 */}
      {showMailPanel && (
        <MailPanel onClose={() => setShowMailPanel(false)} />
      )}
      
      {/* 快速查找指南 */}
      {showQuickSearchGuide && (
        <QuickSearchGuide onClose={() => setShowQuickSearchGuide(false)} />
      )}
      
      {/* 🌟 启动激励弹窗 */}
      {showStartupMotivation && (
        <StartupMotivation
          primaryPlan={primaryPlan}
          userId={session?.user?.id}
          dailyGoalMinutes={primaryPlan?.dailyGoalMinutes || 30}
          onClose={() => setShowStartupMotivation(false)}
          onConfirmGoal={handleConfirmGoal}
          onQuickStart={handleQuickStartFromMotivation}
          onAddMilestone={handleAddMilestoneFromMotivation}
        />
      )}

      <GoalInputModal
        visible={showGoalInputModal}
        userId={session?.user?.id}
        title="添加小目标"
        placeholder="输入小目标"
        onClose={() => setShowGoalInputModal(false)}
        onConfirm={handleAddMilestoneFromMotivation}
      />

      {/* 商城弹窗 */}
      <ShopModal 
        isOpen={showShopModal} 
        onClose={() => {
          setShowShopModal(false);
          // 关闭商城时重新加载主题状态
          setThemeState(getCurrentTheme());
        }}
      />
      
      {/* 动画样式 */}
      <style jsx>{`
        @keyframes breathing {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
          }
        }
        @keyframes bounce-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        @keyframes pulse-gentle {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.02);
          }
        }
        @keyframes breathing-bg {
          0%, 100% {
            opacity: 0.85;
          }
          50% {
            opacity: 1;
          }
        }
        :global(.season-overlay) {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }
        :global(.season-spring),
        :global(.season-autumn) {
          mix-blend-mode: multiply;
          opacity: 0.85;
        }
        :global(.season-summer) {
          mix-blend-mode: screen;
          opacity: 0.85;
        }
        :global(.season-winter) {
          mix-blend-mode: normal;
          opacity: 1;
        }
        :global(.season-particle) {
          position: absolute;
          top: -10%;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        :global(.season-spring .season-particle) {
          background: rgba(132, 204, 22, 0.75);
          border-radius: 4px 10px 4px 10px;
          animation-name: season-fall-leaf;
        }
        :global(.season-autumn .season-particle) {
          background: rgba(249, 115, 22, 0.8);
          border-radius: 6px 12px 6px 12px;
          animation-name: season-fall-leaf;
        }
        :global(.season-winter .season-particle) {
          background: white;
          border-radius: 999px;
          box-shadow: 0 0 4px rgba(148, 163, 184, 0.5);
          animation-name: season-snow-fall;
        }
        :global(.season-summer .season-particle) {
          border: 2px solid rgba(255, 255, 255, 0.9);
          border-radius: 999px;
          background: radial-gradient(
            circle at 28% 24%,
            rgba(255, 255, 255, 0.98) 0%,
            rgba(255, 255, 255, 0.88) 26%,
            rgba(224, 247, 255, 0.6) 58%,
            rgba(150, 227, 255, 0.28) 100%
          );
          box-shadow:
            0 0 14px rgba(255, 255, 255, 0.4),
            0 0 18px rgba(103, 232, 249, 0.28);
          animation-name: season-bubble-rise;
        }

        @keyframes season-fall-leaf {
          0% { transform: translateY(-10%) rotate(0deg); opacity: 0; }
          10% { opacity: 0.7; }
          100% { transform: translateY(110vh) rotate(160deg); opacity: 0; }
        }

        @keyframes season-snow-fall {
          0% { transform: translateY(-5%) translateX(0); opacity: 0; }
          10% { opacity: 0.9; }
          100% { transform: translateY(110vh) translateX(20px); opacity: 0.2; }
        }

        @keyframes season-bubble-rise {
          0% { transform: translateY(110vh) scale(0.7); opacity: 0; }
          10% { opacity: 0.5; }
          100% { transform: translateY(-10%) scale(1); opacity: 0; }
        }
        :global(.animate-breathing) {
          animation: breathing 2s ease-in-out infinite;
        }
        :global(.animate-bounce-gentle) {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
        :global(.animate-pulse-gentle) {
          animation: pulse-gentle 2s ease-in-out infinite;
        }
        :global(.animate-breathing-bg) {
          animation: breathing-bg 4s ease-in-out infinite;
        }
      `}</style>
      </div>
    </>
  );
}
