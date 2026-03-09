import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import ProgressRing from './ProgressRing';
import BottomNavigation from './BottomNavigation';
import UserMenu from './UserMenu';
import PrimaryPlanCard from './PrimaryPlanCard';
import AchievementPanel from './AchievementPanel';
import TodaySummaryCard from './TodaySummaryCard';
import QuickSearchGuide from './QuickSearchGuide';
import SecurityGuideCard from './SecurityGuideCard';
import EchoSpirit from './EchoSpirit';
import EchoSpiritMobile from './EchoSpiritMobile';
import SpiritDialog, { SpiritDialogRef } from './SpiritDialog';
import ShopModal from '~/components/shop/ShopModal';
import GoalInputModal from '~/components/goals/GoalInputModal';
import { getAchievementManager, AchievementManager } from '~/lib/AchievementSystem';
import { LevelManager, UserLevel } from '~/lib/LevelSystem';
import { useUserExp } from '~/hooks/useUserExp';
import { useHeartTreeExp } from '~/hooks/useHeartTreeExp';
import { useAchievements } from '~/hooks/useAchievements';
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
import { HeartTreeManager } from '~/lib/HeartTreeSystem';
import {
  gainHeartTreeExp,
  grantFertilizerBuff,
  loadHeartTreeExpState,
  EXP_STREAK_DAY,
} from '~/lib/HeartTreeExpSystem';
import { MailSystem } from '~/lib/MailSystem';

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
        const order: Record<string, number> = { 'first': 0, 'flow': 1, 'time': 2, 'daily': 3, 'milestone': 4, 'special': 5 };
        return (order[a.category] ?? 6) - (order[b.category] ?? 6);
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
  
  // ========== 持久化 Hooks（数据库同步）==========
  const { userExp, userLevel: hookUserLevel, addUserExp, updateUserExp: saveUserExpToDB } = useUserExp();
  const { expState: heartTreeExpState, updateExpState: updateHeartTreeExpState } = useHeartTreeExp();
  const { 
    achievedIds,
    achievedCount, // 🔥 使用稳定的计数器
    unlockAchievement: unlockAchievementToDB, 
    isAchievementUnlocked,
    isLoading: isAchievementsLoading 
  } = useAchievements();
  
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
  const [panicMode, setPanicMode] = useState(false);
  const renderLimitRef = useRef(0);
  const [spiritState, setSpiritState] = useState<'idle' | 'excited' | 'focus' | 'happy' | 'nod'>('idle'); // 小精灵状态
  const [currentSpiritState, setCurrentSpiritState] = useState<'idle' | 'excited' | 'focus' | 'happy' | 'nod' | 'highfive' | 'highfive-success'>('idle'); // 用于对话框的状态
  const spiritDialogRef = useRef<SpiritDialogRef>(null); // 对话框ref
  
  useEffect(() => {
    // 仅在客户端统计渲染次数，避免 hooks 顺序被中途 return 破坏
    renderLimitRef.current += 1;
    if (renderLimitRef.current > 25) {
      console.error('[Dashboard] 🚨 渲染次数超限，进入 panicMode（不再自动清缓存/刷新）');
      setPanicMode(true);
    }
  });

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
    const todayStatsData = localStorage.getItem('todayStats');
    const allTodayStats = todayStatsData ? JSON.parse(todayStatsData) : {};
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

  // 总专注时长状态（从使用至今累计）
  const [totalFocusMinutes, setTotalFocusMinutes] = useState<number>(() => getTotalFocusMinutes());

  // 从localStorage加载统计数据（其他数据）
  const [stats, setStats] = useState<DashboardStats>(() => {
    if (typeof window !== 'undefined') {
      const savedStats = localStorage.getItem('dashboardStats');
      return savedStats ? JSON.parse(savedStats) : {
        yesterdayMinutes: 0,
        streakDays: 0,
        echoCompanionDays: 0,
        completedGoals: 0
      };
    }
    return {
      yesterdayMinutes: 0,
      streakDays: 0,
      echoCompanionDays: 0,
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
  
  // ========== 同步 Hook 的用户等级到本地 state ==========
  useEffect(() => {
    if (hookUserLevel > 0 && userExp >= 0) {
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
  const [showGoalInputModal, setShowGoalInputModal] = useState(false);
  const [fruits, setFruits] = useState(0);
  const enableMobileGoalEntry = process.env.NEXT_PUBLIC_ENABLE_MOBILE_MICRO_GOAL_ENTRY !== 'false';

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
    if (typeof window === 'undefined') return;
    let cancelled = false;

    const registerCompanionDay = async () => {
      const today = getTodayDate();
      const loginCountedKey = `echoCompanionCounted_${today}`;
      const syncPendingKey = `echoCompanionSyncPending_${today}`;
      const alreadyCountedLocal = localStorage.getItem(loginCountedKey) === 'true';
      const pendingSync = localStorage.getItem(syncPendingKey) === 'true';

      let baseCompanionDays = 0;
      const savedStats = localStorage.getItem('dashboardStats');
      if (savedStats) {
        try {
          baseCompanionDays = JSON.parse(savedStats).echoCompanionDays || 0;
        } catch {
          baseCompanionDays = 0;
        }
      }

      // 登录态下先读数据库，避免跨设备导致累计值回退
      if (session?.user?.id) {
        try {
          const res = await fetch('/api/user/stats');
          if (res.ok) {
            const data = await res.json();
            const dbCompanionDays = data?.stats?.echoCompanionDays || 0;
            const dbLastCompanionDate = data?.stats?.lastEchoCompanionDate || null;
            baseCompanionDays = Math.max(baseCompanionDays, dbCompanionDays);

            if (dbLastCompanionDate === today) {
              localStorage.setItem(loginCountedKey, 'true');
              localStorage.removeItem(syncPendingKey);
              setStats(prev => ({
                ...prev,
                echoCompanionDays: Math.max(prev.echoCompanionDays || 0, dbCompanionDays),
              }));
              return;
            }
          }
        } catch (error) {
          console.warn('⚠️(M) 读取数据库陪伴天数失败，回退本地值:', error);
        }
      }

      if (cancelled) return;
      if (alreadyCountedLocal && !pendingSync) return;

      let targetCompanionDays = baseCompanionDays;
      if (!alreadyCountedLocal) {
        targetCompanionDays = baseCompanionDays + 1;

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
          console.error('Echo陪伴累计时更新心树奖励失败（移动端）:', e);
        }
      }

      localStorage.setItem(syncPendingKey, 'true');
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
            console.log('✅(M) Echo陪伴天数已同步到数据库');
          } else {
            console.warn('⚠️(M) Echo陪伴天数同步失败');
          }
        }).catch(err => {
          console.error('❌(M) Echo陪伴天数同步出错:', err);
        });
      }
    };

    void registerCompanionDay();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // 增加完成的小目标计数
  const incrementCompletedGoals = (count: number) => {
    updateStats({
      completedGoals: stats.completedGoals + count
    });
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

  const handleAddMilestone = async (title: string) => {
    const cleanedTitle = String(title || '').trim();
    if (!cleanedTitle) return;

    if (!primaryPlan) {
      router.push('/plans');
      return;
    }

    const newMilestone: Milestone = {
      id: `milestone-${Date.now()}`,
      title: cleanedTitle,
      isCompleted: false,
      order: (primaryPlan.milestones?.length || 0) + 1,
    };

    setPrimaryPlan((prev) => {
      if (!prev) return prev;
      const updatedPlan = {
        ...prev,
        milestones: [...(prev.milestones || []), newMilestone],
      };

      if (typeof window !== 'undefined') {
        const savedPlans = localStorage.getItem('userPlans');
        const plans = savedPlans ? JSON.parse(savedPlans) : [];
        const updatedPlans = plans.map((item: Project) =>
          item.id === updatedPlan.id ? updatedPlan : item
        );
        localStorage.setItem('userPlans', JSON.stringify(updatedPlans));
      }

      return updatedPlan;
    });
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

        return updatedPlan;
      });

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
        
        // 心树功能暂时屏蔽
        // 增加浇水机会（批量完成小目标）
        // const completedCount = updatedMilestones.filter((m: Milestone) => m.isCompleted).length;
        // const { HeartTreeManager } = require('./HeartTreeSystem');
        // HeartTreeManager.addWaterOpportunityOnMilestoneComplete(completedCount);
      }

      // 更新完成的小目标计数（触发成就检查）
      incrementCompletedGoals(milestoneIds.length);

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
  const handleFocusSessionComplete = async (minutes: number, rating?: number, completed: boolean = true, plannedMinutes?: number) => {
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
      const beforeUserExp = localStorage.getItem('userExp');
      console.log('📅 新的一天开始 - 数据保护检查', {
        日期: today,
        昨日日期: lastFocusDate,
        当前用户经验: beforeUserExp,
        提示: '经验值在日期切换时应保持不变'
      });
      
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
      
      console.log('🤝(M) Echo陪伴累计策略：按登录累计，不再按达标天补增', {
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
      const afterUserExp = localStorage.getItem('userExp');
      if (beforeUserExp !== afterUserExp) {
        console.error('❌❌❌ 严重警告：经验值在日期切换时被意外修改！', {
          切换前: beforeUserExp,
          切换后: afterUserExp,
          损失: (parseFloat(beforeUserExp || '0') - parseFloat(afterUserExp || '0')).toFixed(0) + ' EXP'
        });
        console.error('❌ 正在尝试恢复经验值...');
        // 尝试恢复
        if (beforeUserExp && parseFloat(beforeUserExp) > parseFloat(afterUserExp || '0')) {
          localStorage.setItem('userExp', beforeUserExp);
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

    // 更新行为得分（用于临时心流倍率）
  const dailyGoalMinutes = primaryPlan?.dailyGoalMinutes || 0;
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

    // 更新等级经验值（传递 plannedMinutes 用于判断经验值类型）
    await updateUserExpFromSession(minutes, rating, completed, plannedMinutes);
    
    // 检查首次专注成就（在第一次完成专注时立即触发）
    if (completed && currentTotalMinutes === 0 && newTotalMinutes > 0) {
      // 第一次完成专注，标记到 localStorage
      localStorage.setItem('firstFocusCompleted', 'true');
    }
    
    // 心树机会：专注完成事件（移动端，同样不自动加经验）
    if (completed && minutes > 0 && typeof window !== 'undefined') {
      try {
        // 1）每次完成专注，累积一次浇水机会
        HeartTreeManager.addWaterOpportunityOnFocusComplete();
        console.log('🌳(M) 心树浇水机会 +1');

        // 2）当今日总专注时长首次达到 / 超过每日目标时，额外给一次奖励机会（浇水 + 施肥）
        if (completedDailyGoal) {
          const today = new Date().toISOString().split('T')[0];
          const rewarded = localStorage.getItem(`heartTreeDailyGoalReward_${today}`) === 'true';
          if (!rewarded) {
            HeartTreeManager.addRewardOnGoalComplete();
            localStorage.setItem(`heartTreeDailyGoalReward_${today}`, 'true');
            console.log('🌳(M) 心树每日目标达成奖励：浇水 + 施肥 各 +1');
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
                console.error('❌(M) 连胜天数同步出错:', err);
              });
            }
          }
        }
      } catch (e) {
        console.error('更新心树机会失败（移动端）:', e);
      }
    }
    
    console.log('✅ 统计数据已更新完成');
  };

  // 更新用户经验值（优化后的经验值系统）
  const updateUserExpFromSession = async (minutes: number, rating?: number, completed: boolean = true, plannedMinutes?: number) => {
    const currentExp = userExp;
    
    let sessionExp = 0;
    
    if (completed && minutes > 0) {
      const dailyGoalMinutes = primaryPlan?.dailyGoalMinutes || 0;
      const todayMinutes = todayStats.minutes;
      
      // 判断经验值类型
      if (dailyGoalMinutes > 0 && todayMinutes >= dailyGoalMinutes) {
        // 完成主要计划设置最小专注时长：高经验值
        sessionExp = LevelManager.calculatePrimaryGoalExp(minutes, dailyGoalMinutes, stats.streakDays);
        console.log('📈 经验值类型：完成主要计划目标（高）', { minutes, dailyGoalMinutes, streakDays: stats.streakDays, exp: sessionExp });
      } else if (plannedMinutes && minutes >= plannedMinutes) {
        // 完成自己设定的专注时长（但未达到主要计划最小时长）：中经验值
        sessionExp = LevelManager.calculateCustomGoalExp(minutes, plannedMinutes, stats.streakDays);
        console.log('📈 经验值类型：完成设定目标（中）', { minutes, plannedMinutes, streakDays: stats.streakDays, exp: sessionExp });
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
    await saveUserExpToDB(newTotalExp);
    
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
    (window as any).reportFocusSessionComplete = (minutes: number, rating?: number, completed: boolean = true, plannedMinutes?: number) => {
      handleFocusSessionComplete(minutes, rating, completed, plannedMinutes);
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
      const todayStatsData = localStorage.getItem('todayStats');
      if (todayStatsData) {
        try {
          const allTodayStats = JSON.parse(todayStatsData);
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
      console.log('❌ 未认证，重定向到首页');
      router.push('/');
      return;
    }

    if (authKey.startsWith('authenticated_')) {
      console.log('✅ 用户已通过认证，展示内容（无API调用）');
      setIsLoading(false);
      
      // 延迟一会确保页面已渲染完成
      setTimeout(async () => {
        // 先检查专注完成标记，如果有则优先播放祝贺气泡
        const focusCompleted = localStorage.getItem('focusCompleted');
        if (focusCompleted === 'true') {
          // 显示专注祝贺信息
          if (spiritDialogRef.current) {
            spiritDialogRef.current.showCompletionMessage();
            // 播放完后清除标记，避免重复显示
            localStorage.removeItem('focusCompleted');
          }
          return; // 播完祝贺信息后就不再显示欢迎信息
        }
        
        // 检查每日登录经验值奖励（每天只奖励一次）
        const today = getTodayDate();
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
              const mailSystem = MailSystem.getInstance();
              await mailSystem.refresh();
              console.log('✅ 邮件补发完成，未读计数已更新');
            } else {
              console.warn('邮件补发失败:', response.status);
            }
          } catch (error) {
            console.error('❌ 邮件补发异常:', error);
          }
        };

        backfillMails();
        
        // 如果没有专注完成，再检查是否需要首次欢迎
        // 通过 localStorage 判断欢迎信息是否已显示
        const lastWelcomeDate = localStorage.getItem('lastWelcomeDate');
        
        // 如果是当天第一次进入主页，则播放欢迎信息
        if (lastWelcomeDate !== today) {
          if (spiritDialogRef.current) {
            spiritDialogRef.current.showWelcomeMessage();
            // 记录今天已经显示过欢迎信息
            localStorage.setItem('lastWelcomeDate', today);
          }
        }
      }, 800); // 延迟800ms确保页面渲染完成
    }
  }, [authKey]);

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

  // 🔥 修复：将 Hook 的成就数据同步到 AchievementManager
  useEffect(() => {
    if (isAchievementsLoading) return;
    
    const manager = getAchievementManager();
    // 强制使用 Hook 的数据覆盖 manager 的 localStorage 数据
    manager['achievedAchievements'] = new Set(achievedIds);
    console.log('[Dashboard Mobile] 🔄 同步成就数据到 Manager:', achievedCount, '个');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAchievementsLoading, achievedCount]); // 🔥 使用 achievedCount 而不是 achievedIds，避免 Set 引用变化导致无限循环

  // 初始化成就管理器
  useEffect(() => {
    // 🔥 修复：等待成就数据加载完成后再进行成就检测，避免刷新页面时重复触发
    if (isAchievementsLoading) {
      console.log('[Dashboard Mobile] ⏳ 等待成就数据加载...');
      return;
    }
    
    console.log('[Dashboard Mobile] ✅ 成就数据已加载，开始检测成就...', { achievedCount: achievedIds.size });
    
    const manager = getAchievementManager();
    setAchievementManager(manager);
    
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
    
    // 第一次完成专注成就 - 检查标记或总专注时长
    const firstFocusCompleted = localStorage.getItem('firstFocusCompleted') === 'true';
    const flowData = localStorage.getItem('flowMetrics');
    const metrics = flowData ? JSON.parse(flowData) : null;
    const sessionCount = metrics?.sessionCount || 0;
    const hasAnyFocus = firstFocusCompleted || totalFocusMinutes > 0 || sessionCount > 0;
    
    const firstFocusAchievement = hasAnyFocus 
      ? manager.checkFirstTimeAchievements('focus')
      : [];
    
    // 如果成就已解锁，清除标记（避免重复检查）
    if (firstFocusAchievement.length > 0) {
      localStorage.removeItem('firstFocusCompleted');
    }
    
    // 检查其他首次成就（通过 localStorage 标记）
    const firstPlanCreated = localStorage.getItem('firstPlanCreated') === 'true';
    const firstMilestoneCreated = localStorage.getItem('firstMilestoneCreated') === 'true';
    const firstPlanCompleted = localStorage.getItem('firstPlanCompleted') === 'true';
    
    const firstPlanCreatedAchievement = firstPlanCreated 
      ? manager.checkFirstTimeAchievements('plan_created')
      : [];
    const firstMilestoneCreatedAchievement = firstMilestoneCreated 
      ? manager.checkFirstTimeAchievements('milestone_created')
      : [];
    const firstPlanCompletedAchievement = firstPlanCompleted 
      ? manager.checkFirstTimeAchievements('plan_completed')
      : [];
    
    // 如果成就已解锁，清除标记（避免重复检查）
    if (firstPlanCreatedAchievement.length > 0) {
      localStorage.removeItem('firstPlanCreated');
    }
    if (firstMilestoneCreatedAchievement.length > 0) {
      localStorage.removeItem('firstMilestoneCreated');
    }
    if (firstPlanCompletedAchievement.length > 0) {
      localStorage.removeItem('firstPlanCompleted');
    }
    
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
      }
      
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
          
          // 心树功能暂时屏蔽
          // 增加施肥机会（成就解锁）
          // const { HeartTreeManager } = require('./HeartTreeSystem');
          // HeartTreeManager.addFertilizeOpportunityOnAchievementUnlock(allNew.length);
        }
      })();
      
      // 3秒后自动清空，以便再次触发
      setTimeout(() => setNewAchievements([]), 3000);
    }
  }, [isAchievementsLoading, flowIndex.score, totalFocusMinutes, weeklyStats.totalMinutes, todayStats.minutes, stats.completedGoals]);
  
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
    if (userExp >= 0) {
      const levelInfo = LevelManager.calculateLevel(userExp);
      setUserLevel(levelInfo);
      console.log('📊 用户等级信息', levelInfo);
    }
  }, [userExp, todayStats.minutes, weeklyStats.totalMinutes, stats.streakDays]);

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

  // 加载状态
  const showLoading = sessionStatus === 'loading' || isLoading;
  const showUnauthed = sessionStatus === 'unauthenticated' || !session;

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
  const activeMilestones = planMilestones.filter((milestone) => !milestone.isCompleted); // 只显示未完成的小目标
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

  // 终极目标卡片组件
  const MilestoneCard = () => {
    const finalGoal = primaryPlan?.finalGoal;
    
    return (
      <div 
        onClick={() => router.push('/plans')}
        className="bg-gradient-to-br from-[#fff7da] via-[#f3c575] to-[#d88b3b] rounded-3xl p-6 shadow-lg shadow-amber-200/60 text-[#4f2a07] hover:scale-[1.02] transition-all duration-300 cursor-pointer relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="text-6xl">🏔️</span>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-[#4f2a07]/70 font-medium">终极目标</p>
        </div>
        
        <div className="space-y-3 relative z-10">
          {finalGoal ? (
            <>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold line-clamp-2 leading-tight">
                  {finalGoal.content}
                </p>
              </div>
              <p className="text-xs text-[#4f2a07]/60 font-medium">
                {finalGoal.isCompleted ? '已达成！点击回顾' : '点击前往计划管理'}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <p className="text-lg font-bold">这片领土还没有终极目标要征服</p>
              </div>
              <button className="mt-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold hover:bg-white/50 transition-colors">
                去设置
              </button>
            </>
          )}
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
            const isLast = index === activeMilestones.length - 1;
            return (
              <div 
                key={milestone.id} 
                className={`space-y-2 transition-all duration-500 ${
                  isCompleting ? 'opacity-0 transform scale-95' : 'opacity-100'
                }`}
              >
                <button
                  onClick={() => handleMilestoneToggle(milestone.id)}
                  disabled={isCompleting}
                  className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
                    isCompleting
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

        <div className="mt-6 pt-4 border-t border-zinc-200">
          <button
            onClick={() => router.push('/plans')}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium transition-all"
          >
            前往管理计划
          </button>
        </div>

      </>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 relative pb-24">
      {panicMode ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-gray-700">页面状态异常，但已保护，不会再自杀式刷新。</p>
            <button
              className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
            >
              手动清缓存并刷新
            </button>
          </div>
        </div>
      ) : showLoading ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      ) : showUnauthed ? null : (
        <>
          {/* 成就通知 */}
          <AchievementNotification />
          
          {/* 小精灵对话 */}
          <SpiritDialog
            ref={spiritDialogRef}
            spiritState={effectiveSpiritState}
            onStateChange={(newState) => {
              setCurrentSpiritState(newState);
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
            <UserMenu
              userInitial={session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'}
            />
          </div>
        </div>
      </nav>
      )}

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-10">
        <section className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-8">
          <div className="space-y-6">
            <div className="bg-white/80 border border-white/60 rounded-3xl p-6 shadow-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer relative">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-4 w-full">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.4em] text-teal-500 font-medium">今日节奏</p>
                    <div className="block xl:hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">{progress >= 1 ? '100%' : `${Math.round(progress * 100)}%`}</span>
                        <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, progress * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <div>
                      <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-zinc-900 mb-2">
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
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleStartFocus}
                        className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-medium hover:from-teal-600 hover:to-cyan-600 transition shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50"
                      >
                        开始专注
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* 小精灵定位调整 */}
              <div className="hidden lg:block absolute pointer-events-none" style={{ bottom: '-60px', left: 'calc(50% + 50px)', transform: 'translateX(-50%)' }}>
                <div className="pointer-events-auto">
                  <EchoSpirit
                    state="idle"
                    onStateChange={(newState) => {
                      if (newState === 'idle' || newState === 'happy' || newState === 'excited') {
                        setCurrentSpiritState(newState as 'idle' | 'happy' | 'excited');
                      }
                    }}
                    onClick={async () => {
                      const today = getTodayDate();
                      const lastSpiritInteractionDate = localStorage.getItem('lastSpiritInteractionDate');
                      if (lastSpiritInteractionDate !== today) {
                        const spiritExp = LevelManager.calculateSpiritInteractionExp();
                        await addUserExp(spiritExp); // 使用 Hook 自动保存到数据库
                        localStorage.setItem('lastSpiritInteractionDate', today);
                        // userLevel 会自动同步
                      }
                      if (spiritDialogRef.current) {
                        spiritDialogRef.current.showMessage();
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 移动端显示的计划卡片 - 保持全尺寸 */}
            <div className="xl:hidden bg-white/90 border border-white/70 rounded-3xl p-6 shadow-lg shadow-emerald-100/40">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-teal-500">当前计划</p>
                  <h3 className="text-xl font-semibold text-zinc-900 mt-1">
                    {primaryPlan ? primaryPlan.name : '暂无主要计划'}
                  </h3>
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

                  {enableMobileGoalEntry && (
                    <button
                      onClick={() => setShowGoalInputModal(true)}
                      className="w-full mb-4 px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-sm font-medium transition-all"
                    >
                      复用或添加小目标（可选）
                    </button>
                  )}

                  {/* 移动端显示的终极目标信息 */}
                  {primaryPlan.finalGoal && (
                    <div className="mt-4 pt-4 border-t border-zinc-100">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🏔️</span>
                        <p className="text-xs uppercase tracking-[0.2em] text-amber-600/70 font-medium">终极目标</p>
                      </div>
                      <p className="text-sm font-medium text-zinc-800 line-clamp-2">
                        {primaryPlan.finalGoal.content}
                      </p>
                    </div>
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

            <div className="hidden xl:block space-y-6">
              <ShopCard />
              <MilestoneCard />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* 移动端：等级卡片和本周专注放在同一行 */}
            <div className="order-2 xl:order-1 xl:grid xl:gap-5 xl:grid-cols-4 flex flex-col gap-4">
              <div className="flex flex-row gap-4 xl:hidden">
                {userLevel && (
                  <div className="flex-1 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-[2rem] p-5 text-white shadow-lg shadow-purple-500/20 flex flex-col justify-between aspect-[4/3] hover:scale-[1.02] transition-all duration-300 cursor-pointer">
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

                <div className="flex-1 bg-white/90 backdrop-blur-sm border-2 border-white/80 rounded-[2rem] p-5 shadow-lg shadow-emerald-100/30 flex flex-col justify-between aspect-[4/3] relative hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-teal-500 font-medium">本周</p>
                    <button
                      onClick={() => setShowWeeklyInfo(!showWeeklyInfo)}
                      data-tooltip-trigger
                      className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center"
                    >
                      <span className="text-[10px] font-bold text-zinc-500">!</span>
                    </button>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-2xl font-bold text-zinc-900 leading-none">
                      {weeklyHours}h<span className="text-sm font-medium text-zinc-400">{weeklyMinutesRemainder}m</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* PC端：保持原有布局 */}
              {userLevel && (
                <div className="hidden xl:flex bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-[2rem] p-8 md:p-9 text-white shadow-2xl shadow-purple-500/30 flex-col justify-between aspect-square md:aspect-auto hover:scale-[1.02] transition-all duration-300 hover:shadow-purple-500/50 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/70 font-medium">当前等级</p>
                    <span className="text-3xl animate-pulse">⭐</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-4xl md:text-5xl font-bold">LV.{userLevel.currentLevel}</p>
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

              {/* Echo陪伴、本周专注和今日总结卡片 */}
              <div className="flex flex-row gap-4">
                <div className="flex-1 bg-white/90 backdrop-blur-sm border-2 border-emerald-50 rounded-[2rem] p-5 shadow-lg shadow-emerald-100/30 flex flex-col justify-between aspect-[4/3] hover:scale-[1.02] transition-all duration-300 cursor-pointer relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-teal-500 font-medium">Echo陪伴</p>
                    <button
                      onClick={() => setShowStreakInfo(!showStreakInfo)}
                      data-tooltip-trigger
                      className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center"
                    >
                      <span className="text-[10px] font-bold text-zinc-500">!</span>
                    </button>
                  </div>
                  {showStreakInfo && (
                    <div data-tooltip-trigger className="absolute top-10 right-0 bg-white rounded-xl p-3 shadow-xl border border-zinc-200 z-50 w-[150px]">
                      <p className="text-xs text-zinc-600 leading-relaxed">
                        你在Echo停靠过的天数（累积+1）
                      </p>
                    </div>
                  )}
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-3xl font-bold text-zinc-900 leading-none">{stats.echoCompanionDays ?? 0}<span className="text-sm text-zinc-500 ml-1">天</span></p>
                  </div>
                  <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden mt-auto">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full w-1/2"></div>
                  </div>
                </div>

                <div className="flex-1 aspect-[4/3]">
                  <TodaySummaryCard
                    userId={session?.user?.id || ''}
                    hasFocusOverride={todayStats.minutes > 0}
                  />
                </div>
              </div>
            </div>

            <div className="xl:hidden order-3">
              <ShopCard />
            </div>

            <div className="order-4 xl:order-3">
              <AchievementsSection />
            </div>
          </div>
        </section>
      </main>

      <div className="sm:hidden fixed bottom-28 right-6 z-20">
        <EchoSpiritMobile
          state={currentSpiritState}
          allowFocus={false}
          isCompleted={progress >= 1}
          onStateChange={(newState) => {
            if (newState === 'focus') {
              setCurrentSpiritState('idle');
            } else {
              setCurrentSpiritState(newState);
            }
          }}
          onClick={() => {
            // 小精灵互动经验值奖励（每天只奖励一次）
            const today = getTodayDate();
            const lastSpiritInteractionDate = localStorage.getItem('lastSpiritInteractionDate');
            if (lastSpiritInteractionDate !== today) {
              const spiritExp = LevelManager.calculateSpiritInteractionExp();
              const currentExp = userExp;
              const newExp = currentExp + spiritExp;
              localStorage.setItem('userExp', newExp.toString());
              localStorage.setItem('lastSpiritInteractionDate', today);
              console.log('📈 小精灵互动经验值奖励', { exp: spiritExp, total: newExp });
              setUserLevel(LevelManager.calculateLevel(newExp));
            }
            
            if (spiritDialogRef.current) {
              spiritDialogRef.current.showMessage();
            }
          }}
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

      {/* 商城弹窗 */}
      <ShopModal 
        isOpen={showShopModal} 
        onClose={() => setShowShopModal(false)} 
      />

      {enableMobileGoalEntry && (
        <GoalInputModal
          visible={showGoalInputModal}
          userId={session?.user?.id}
          title="添加小目标"
          placeholder="例如：读 2 页 / 写 5 行"
          onClose={() => setShowGoalInputModal(false)}
          onConfirm={handleAddMilestone}
        />
      )}
      
          {/* 快速查找指南 */}
          {showQuickSearchGuide && (
            <QuickSearchGuide onClose={() => setShowQuickSearchGuide(false)} />
          )}
        </>
      )}
    </div>
  );
}

