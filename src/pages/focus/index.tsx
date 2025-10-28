'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import FocusSummaryModal from './FocusSummaryModal';
import FocusSummary from './FocusSummary';
import BottomNavigation from '../dashboard/BottomNavigation';

type FocusState = 
  | 'preparing'      // 准备中（设置时长）
  | 'starting'       // 3秒倒计时
  | 'running'        // 专注进行中
  | 'paused'         // 已暂停
  | 'completed'      // 正常完成
  | 'interrupted';   // 意外中断

interface FocusSession {
  sessionId: string;
  plannedDuration: number;  // 计划时长（分钟）
  elapsedTime: number;      // 已专注时长（秒）
  status: FocusState;
  startTime: string;
  pauseStart?: string;
  pauseCount: number;
  customDuration: number;   // 用户自定义时长（分钟）
}

export default function Focus() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [state, setState] = useState<FocusState>('preparing');
  const [countdown, setCountdown] = useState(3);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [plannedMinutes, setPlannedMinutes] = useState(30);
  const [customDuration, setCustomDuration] = useState(30);
  const [pauseCount, setPauseCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [showEndOptions, setShowEndOptions] = useState(false);
  const [pauseUpdateTrigger, setPauseUpdateTrigger] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [planMilestones, setPlanMilestones] = useState<Array<{ id: string; title: string; completed: boolean; order: number }>>([]);
  const [customGoals, setCustomGoals] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<FocusSession | null>(null);
  
  // 加载主要计划作为默认
  const [availablePlans, setAvailablePlans] = useState<Array<{id:string; name:string; isPrimary:boolean; dailyGoalMinutes:number}>>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | 'free'>('free');
  const mockPlans = {
    name: '自由时间',
    date: new Date().toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  };
  
  // 所有目标（计划小目标 + 自定义）- 只显示未完成的
  const allGoals = [
    ...planMilestones
      .filter(m => !m.isCompleted) // 确保只显示未完成的
      .map(m => ({ 
        id: m.id, 
        title: m.title, 
        completed: false // 计划中的小目标总是未完成的（已完成的已被过滤）
      })), 
    ...customGoals
  ];

  // 当前选中的目标信息
  const selectedGoalInfo = allGoals.find(g => g.id === selectedGoal);

  // 添加自定义小目标
  const handleAddGoal = () => {
    if (newGoalTitle.trim()) {
      const newGoal = {
        id: Date.now().toString(),
        title: newGoalTitle,
        completed: false
      };
      setCustomGoals([...customGoals, newGoal]);
      setNewGoalTitle('');
      setShowAddGoal(false);
    }
  };

  // 选择计划或自由时间
  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedPlanId(value as any);
    
    // 清空之前选中的小目标
    setSelectedGoal(null);
    
    if (value === 'free') {
      setSessionName(`${mockPlans.name} - ${mockPlans.date}`);
      setPlannedMinutes(30);
      // 自由时间：清空计划小目标，只显示自定义
      setPlanMilestones([]);
      setCustomGoals([]);
    } else {
      const plan = availablePlans.find(p => p.id === value);
      if (plan) {
        setSessionName(`${plan.name} - ${mockPlans.date}`);
        setPlannedMinutes(plan.dailyGoalMinutes || 30);
        
        // 从localStorage加载计划的小目标 - 只加载未完成的
        const savedPlans = JSON.parse(localStorage.getItem('userPlans') || '[]');
        const selectedPlan = savedPlans.find((p: any) => p.id === value);
        if (selectedPlan && selectedPlan.milestones) {
          // 过滤掉已完成的小目标
          const uncompleted = selectedPlan.milestones.filter((m: any) => !m.isCompleted);
          console.log('📋 切换计划，加载未完成小目标:', uncompleted.length);
          setPlanMilestones(uncompleted);
        } else {
          setPlanMilestones([]);
        }
        setCustomGoals([]);
      }
    }
  };

  // 保存状态到localStorage
  const saveState = (session: Partial<FocusSession>) => {
    if (!sessionRef.current) return;
    
    const updatedSession = {
      ...sessionRef.current,
      ...session
    };
    sessionRef.current = updatedSession;
    localStorage.setItem('focusSession', JSON.stringify(updatedSession));
  };

  // 初始化：加载计划与默认值 - 实时同步
  useEffect(() => {
    const loadPlans = () => {
      console.log('🔄 重新加载计划数据...');
      // 加载可用计划
      const plans = JSON.parse(localStorage.getItem('userPlans') || '[]');
      setAvailablePlans(plans);
      const primary = plans.find((p:any) => p.isPrimary);
      
      if (primary) {
        setSelectedPlanId(primary.id);
        setSessionName(`${primary.name} - ${mockPlans.date}`);
        setPlannedMinutes(primary.dailyGoalMinutes || 30);
        // 加载主要计划的小目标 - 过滤已完成的目标
        if (primary.milestones) {
          console.log('📋 加载小目标，总数:', primary.milestones.length);
          const uncompleted = primary.milestones.filter((m: any) => !m.isCompleted);
          console.log('✅ 未完成的小目标:', uncompleted.length);
          setPlanMilestones(uncompleted);
        }
      } else {
        setSelectedPlanId('free');
        setSessionName(`${mockPlans.name} - ${mockPlans.date}`);
        setPlannedMinutes(30);
        setPlanMilestones([]);
      }
    };

    // 初始加载
    loadPlans();
    
    // 如果不在专注状态，清理旧的状态
    if (state === 'preparing') {
      // 清理可能存在的完成/中断状态
      const saved = localStorage.getItem('focusSession');
      if (saved) {
        const session: FocusSession = JSON.parse(saved);
        if (session.status === 'completed' || session.status === 'interrupted') {
          localStorage.removeItem('focusSession');
          setElapsedTime(0);
        }
      }
    }

    // 监听localStorage变化以实时同步计划数据
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userPlans') {
        console.log('🔔 检测到计划数据变化，重新加载...');
        loadPlans();
      }
    };

    // 监听页面可见性变化（从dashboard返回时重新加载）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 如果页面变为可见且不在运行状态，重新加载计划数据
        if (state === 'preparing') {
          console.log('🔔 页面可见，重新加载计划数据...');
          loadPlans();
        } else if (state !== 'running' && state !== 'paused') {
          // 如果页面从隐藏变为可见且不在运行状态，重置到准备状态
          console.log('🔄 检测到页面状态变化，重置会话');
          localStorage.removeItem('focusSession');
          setElapsedTime(0);
          setState('preparing');
          setShowSummary(false);
          setShowEndOptions(false);
          // 重新初始化
          const newSession: FocusSession = {
            sessionId: `focus_${Date.now()}`,
            plannedDuration: plannedMinutes,
            elapsedTime: 0,
            status: 'preparing',
            startTime: new Date().toISOString(),
            pauseCount: 0,
            customDuration: plannedMinutes
          };
          sessionRef.current = newSession;
          // 重新加载计划数据
          loadPlans();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 每2秒检查一次计划数据是否有变化（备用机制）
    const interval = setInterval(() => {
      if (state === 'preparing') {
        loadPlans();
      }
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [state, mockPlans.date]);


  // 从localStorage恢复状态 - 增强版恢复机制
  useEffect(() => {
    const saved = localStorage.getItem('focusSession');
    if (saved) {
      try {
        const session: FocusSession = JSON.parse(saved);
        
        // 如果会话已结束，不恢复计时器
        const sessionEnded = localStorage.getItem('focusSessionEnded');
        if (sessionEnded === 'true' && (session.status === 'completed' || session.status === 'interrupted')) {
          console.log('🔒 会话已结束，直接恢复结束状态');
          sessionRef.current = session;
          setElapsedTime(session.elapsedTime); // 使用保存的固定时间
          setPlannedMinutes(session.plannedDuration);
          setCustomDuration(session.customDuration);
          setPauseCount(session.pauseCount);
          setState(session.status);
          return;
        }
        
        const lastSaved = localStorage.getItem('focusTimerLastSaved');
        const now = new Date();
        
        // 计算自上次保存以来的时间差（用于恢复计时）
        let timeDiff = 0;
        if (lastSaved && session.status === 'running') {
          const lastSavedTime = new Date(lastSaved);
          timeDiff = Math.floor((now.getTime() - lastSavedTime.getTime()) / 1000);
          console.log('🔄 检测到中断的计时器，继续运行...', { 
            savedTime: session.elapsedTime, 
            timeDiff, 
            total: session.elapsedTime + timeDiff 
          });
        }
        
        const startTime = new Date(session.startTime);
        const totalDiff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        
        // 如果距离上次专注在24小时内
        if (totalDiff < 24 * 3600) {
          const restoredElapsedTime = session.elapsedTime + timeDiff;
          
          sessionRef.current = session;
          setElapsedTime(restoredElapsedTime);
          setPlannedMinutes(session.plannedDuration);
          setCustomDuration(session.customDuration);
          setPauseCount(session.pauseCount);
          
          // 恢复状态
          if (session.status === 'running') {
            // 如果计时器还在运行，自动恢复
            setState('running');
            // 自动继续计时
            setTimeout(() => {
              intervalRef.current = setInterval(() => {
                setElapsedTime(prev => {
                  const newTime = prev + 1;
                  saveState({ elapsedTime: newTime });
                  
                  // 检查是否达到目标时长
                  if (newTime >= session.plannedDuration * 60) {
                    setTimeout(() => endFocus(true), 100);
                  }
                  
                  return newTime;
                });
              }, 1000);
            }, 1000);
            
            // 显示恢复通知
            console.log('✅ 已恢复专注计时器', { 
              elapsed: Math.floor(restoredElapsedTime / 60) + '分钟',
              goal: session.plannedDuration + '分钟'
            });
          } else if (session.status === 'paused') {
            setState('paused');
            setIsPaused(true);
          } else if (session.status === 'completed' || session.status === 'interrupted') {
            // 如果是已完成或中断状态，冻结时间，不恢复计时器
            setState(session.status);
            console.log('🔒 专注会话已结束，时间已冻结', { elapsed: Math.floor(restoredElapsedTime / 60) + '分钟' });
          } else {
            setState('preparing');
          }
        } else {
          console.log('⏰ 专注会话已过期（超过24小时），清理状态');
          localStorage.removeItem('focusSession');
          localStorage.removeItem('focusTimerLastSaved');
        }
      } catch (e) {
        console.error('恢复状态失败:', e);
      }
    } else {
      // 初始化新会话，确保是干净的状态
      const newSession: FocusSession = {
        sessionId: `focus_${Date.now()}`,
        plannedDuration: plannedMinutes,
        elapsedTime: 0,
        status: 'preparing',
        startTime: new Date().toISOString(),
        pauseCount: 0,
        customDuration: 30
      };
      sessionRef.current = newSession;
      localStorage.setItem('focusSession', JSON.stringify(newSession));
    }
  }, []);

  // 当状态变回preparing时，重置所有相关状态
  useEffect(() => {
    if (state === 'preparing') {
      setShowEndOptions(false);
      setShowSummary(false);
      setShowConfetti(false);
      setPauseCount(0);
      setIsPaused(false);
      setCountdown(3);
    }
  }, [state]);

  // 清理计时器
  const cleanupInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 开始专注流程
  const startFocus = () => {
    if (!sessionRef.current) return;
    
    // 如果是选择计划（非自由时间），将自定义小目标添加到计划中
    if (selectedPlanId !== 'free' && customGoals.length > 0) {
      const savedPlans = JSON.parse(localStorage.getItem('userPlans') || '[]');
      const updatedPlans = savedPlans.map((p: any) => {
        if (p.id === selectedPlanId) {
          // 找到当前小目标的最大order值
          const maxOrder = p.milestones.length > 0 
            ? Math.max(...p.milestones.map((m: any) => m.order))
            : 0;
          
          // 将自定义小目标添加为新的milestones
          const newMilestones = customGoals.map((goal, index) => ({
            id: goal.id,
            title: goal.title,
            isCompleted: false,
            order: maxOrder + index + 1
          }));
          
          return {
            ...p,
            milestones: [...p.milestones, ...newMilestones]
          };
        }
        return p;
      });
      
      localStorage.setItem('userPlans', JSON.stringify(updatedPlans));
    }
    
    // 清理可能存在的旧计时器
    cleanupInterval();
    
    setState('starting');
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          beginFocus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const beginFocus = () => {
    if (!sessionRef.current) return;
    
    // 清理可能存在的旧计时器
    cleanupInterval();
    
    setState('running');
    saveState({ 
      status: 'running',
      startTime: new Date().toISOString()
    });
    
    // 开始计时
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;
        saveState({ elapsedTime: newTime });
        
        // 检查是否达到目标时长
        if (newTime >= plannedMinutes * 60) {
          // 自动结束并标记为完成
          setTimeout(() => endFocus(true), 100);
        }
        
        return newTime;
      });
    }, 1000);
  };

  // 暂停专注
  const pauseFocus = () => {
    if (!sessionRef.current || pauseCount >= 1) return;
    
    // 立即停止计时
    cleanupInterval();
    
    // 记录暂停开始时间
    const now = new Date();
    setPauseStartTime(now);
    setIsPaused(true);
    setPauseCount(prev => prev + 1);
    setState('paused');
    
    saveState({ 
      status: 'paused',
      pauseStart: now.toISOString(),
      pauseCount: pauseCount + 1
    });
  };

  // 恢复专注
  const resumeFocus = () => {
    if (!sessionRef.current || !isPaused) return;
    
    setState('running');
    setIsPaused(false);
    
    beginFocus();
    saveState({ status: 'running' });
  };

  // 结束专注
  const endFocus = (completed: boolean = false) => {
    // 立即停止所有计时器（彻底清理）
    cleanupInterval();
    
    // 强制清除所有可能的计时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (!sessionRef.current) return;
    
    // 确保时间是固定的（不会继续增加）
    const finalElapsedTime = elapsedTime;
    
    // 保存最终状态 - 标记为完成或中断，时间被冻结
    const finalState = completed ? 'completed' : 'interrupted';
    const finalSession = {
      ...sessionRef.current,
      status: finalState,
      elapsedTime: finalElapsedTime
    };
    saveState(finalSession);
    
    // 标记会话已结束，防止恢复
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusSessionEnded', 'true');
    }
    
    // 报告专注时长到dashboard（无论是完成还是中断都记录）
    if (finalElapsedTime > 0) {
      const minutes = Math.floor(finalElapsedTime / 60);
      const status = completed ? '✅ 完成' : '⚠️ 中断';
      
      console.log('📊 准备报告专注时长', { 
        status,
        minutes, 
        finalElapsedTime,
        hasFunction: typeof (window as any).reportFocusSessionComplete 
      });
      
      // 获取用户评分（如果有，且仅完成时）
      const rating = completed ? localStorage.getItem('lastFocusRating') : null;
      const numericRating = rating ? parseFloat(rating) : undefined;
      
      // 调用dashboard的回调函数更新统计数据
      if (typeof window !== 'undefined' && (window as any).reportFocusSessionComplete) {
        console.log('✅ 调用 reportFocusSessionComplete', { 
          minutes, 
          completed,
          numericRating 
        });
        (window as any).reportFocusSessionComplete(minutes, numericRating, completed);
      } else {
        console.warn('⚠️ reportFocusSessionComplete 函数不存在，使用备用方案');
        
        // 备用方案：直接更新localStorage
        try {
          const currentStats = JSON.parse(localStorage.getItem('dashboardStats') || '{}');
          const updatedStats = {
            todayMinutes: (currentStats.todayMinutes || 0) + minutes,
            todayGoal: currentStats.todayGoal || 0,
            weeklyMinutes: (currentStats.weeklyMinutes || 0) + minutes,
            streakDays: currentStats.streakDays || 0,
            completedGoals: currentStats.completedGoals || 0
          };
          localStorage.setItem('dashboardStats', JSON.stringify(updatedStats));
          console.log('📦 备用方案：已直接更新localStorage', updatedStats);
        } catch (e) {
          console.error('❌ 更新统计数据失败:', e);
        }
      }
    }
    
    // 显示礼花效果（仅完成时）
    if (completed) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
    
    // 显示结束选项界面
    setState(finalState);
    setShowEndOptions(false);
    
    console.log('🛑 专注计时器已停止', { finalElapsedTime, state: finalState });
    
    // 延迟一下再显示选项，让用户看到结果
    setTimeout(() => {
      setShowEndOptions(true);
    }, 1500);
  };

  // 返回主页
  const goToDashboard = () => {
    // 清理所有状态和标志
    localStorage.removeItem('focusSession');
    localStorage.removeItem('focusSessionEnded');
    localStorage.removeItem('focusTimerLastSaved');
    setElapsedTime(0);
    setState('preparing');
    setShowEndOptions(false);
    setShowSummary(false);
    setShowConfetti(false);
    cleanupInterval(); // 确保停止所有计时器
    router.push('/dashboard');
  };

  // 继续专注
  const continueFocus = () => {
    // 重置状态
    setState('preparing');
    setShowEndOptions(false);
    setShowSummary(false);
    setShowConfetti(false);
    setElapsedTime(0);
    // 清理所有标志和旧的会话
    localStorage.removeItem('focusSession');
    localStorage.removeItem('focusSessionEnded');
    localStorage.removeItem('focusTimerLastSaved');
    cleanupInterval(); // 确保停止所有计时器
    // 重新初始化会话
    const newSession: FocusSession = {
      sessionId: `focus_${Date.now()}`,
      plannedDuration: plannedMinutes,
      elapsedTime: 0,
      status: 'preparing',
      startTime: new Date().toISOString(),
      pauseCount: 0,
      customDuration: plannedMinutes
    };
    sessionRef.current = newSession;
    localStorage.setItem('focusSession', JSON.stringify(newSession));
    
    // 延迟一点确保状态重置完成
    setTimeout(() => {
      router.push('/focus');
    }, 100);
  };

  // 做小结
  const openSummary = () => {
    setShowSummary(true);
  };

  // 保存小结
  const handleSummarySave = async (rating: number, note: string) => {
    try {
      // 保存评分到localStorage，供心流指数计算使用
      localStorage.setItem('lastFocusRating', rating.toString());
      
      // 保存到后端
      await fetch('/api/focus/save-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionRef.current?.sessionId,
          duration: elapsedTime,
          rating,
          note,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('保存小结失败:', error);
    }
    // 注意：这里不关闭小结页面，让FocusSummary组件自己处理成功显示
  };

  // 跳过小结（返回到选项页面）
  const handleSummarySkip = () => {
    setShowSummary(false);
    setShowEndOptions(true);
  };

  // 保存专注小结
  const handleSaveSummary = async (summary: string, rating: number) => {
    try {
      const response = await fetch('/api/focus/save-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionRef.current?.sessionId,
          duration: elapsedTime,
          summary,
          rating,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error('保存专注小结失败');
      }
    } catch (error) {
      console.error('保存专注小结出错:', error);
    }
  };

  // 关闭小结并返回
  const handleCloseSummary = () => {
    setShowSummaryModal(false);
    router.push('/dashboard');
  };

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理页面关闭/刷新 - 保存当前状态和累计时间
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state === 'running' || state === 'paused') {
        // 保存最终状态（包括累计时间）
        if (sessionRef.current) {
          saveState({ elapsedTime, lastSync: new Date().toISOString() });
        }
        // 记录保存时间戳
        localStorage.setItem('focusTimerLastSaved', new Date().toISOString());
        // 允许关闭但先保存状态
        e.preventDefault();
        e.returnValue = '专注计时正在进行中，确定要离开吗？您的进度会被保存。';
      }
    };

    // 定期保存（每10秒）
    let saveInterval: NodeJS.Timeout | null = null;
    if (state === 'running') {
      saveInterval = setInterval(() => {
        if (sessionRef.current) {
          saveState({ elapsedTime, lastSync: new Date().toISOString() });
          console.log('⏱️ 自动保存中...', { elapsedTime, timestamp: new Date().toISOString() });
        }
      }, 10000); // 每10秒保存一次
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveInterval) clearInterval(saveInterval);
    };
  }, [state, elapsedTime]);

  // 更新时间显示（用于暂停时长）
  useEffect(() => {
    if (state === 'paused') {
      const interval = setInterval(() => {
        // 触发重新渲染以更新暂停时长显示
        setPauseUpdateTrigger(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state]);

  // 准备状态UI
  if (state === 'preparing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 pb-20">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">准备专注</h1>
            
            {/* 计划选择 */}
            <div className="bg-white/70 rounded-2xl p-4 border border-gray-100 mb-4">
              <label className="block text-sm text-gray-600 mb-2">选择计划</label>
              <select value={selectedPlanId} onChange={handlePlanChange} className="w-full px-3 py-2 border rounded-xl bg-white">
                {availablePlans.map(p => (
                  <option key={p.id} value={p.id}>{p.isPrimary ? '🌟 ' : ''}{p.name}</option>
                ))}
                <option value="free">🕊️ 自由时间</option>
              </select>
            </div>
            
            {/* 计划名称 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                本次计划名称
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                placeholder="计划名称"
              />
            </div>
            
            {/* 小目标选择 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {selectedPlanId === 'free' ? '设置小目标（可选）' : '选择小目标（可选）'}
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
                {allGoals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`w-full text-left rounded-xl p-3 transition-all ${
                      selectedGoal === goal.id
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{goal.title}</span>
                      {selectedGoal === goal.id && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* 添加自定义目标按钮 */}
              {!showAddGoal && (
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="w-full rounded-xl bg-gray-100 hover:bg-gray-200 p-3 flex items-center justify-center gap-2 text-gray-600 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-semibold">
                    {selectedPlanId === 'free' ? '设置自定义小目标' : '添加自定义小目标（将加入计划）'}
                  </span>
                </button>
              )}
              
              {/* 添加目标输入框 */}
              {showAddGoal && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="输入小目标..."
                    className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-2 focus:border-teal-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAddGoal}
                    className="rounded-xl bg-teal-500 text-white px-4 py-2 hover:bg-teal-600 transition-all"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => {
                      setShowAddGoal(false);
                      setNewGoalTitle('');
                    }}
                    className="rounded-xl bg-gray-100 text-gray-700 px-4 py-2 hover:bg-gray-200 transition-all"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  设置专注时长（分钟）
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={customDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 5 && value <= 180) {
                      setCustomDuration(value);
                      setPlannedMinutes(value);
                    }
                  }}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-2xl text-center font-bold text-teal-600 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
                <div className="flex gap-2 mt-3">
                  {[15, 25, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        setCustomDuration(mins);
                        setPlannedMinutes(mins);
                      }}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        customDuration === mins
                          ? 'bg-teal-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {mins}min
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={startFocus}
                className="w-full rounded-xl bg-teal-500 px-4 py-4 text-white font-semibold text-lg hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-teal-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
              >
                开始专注
              </button>
            </div>
          </div>
        </div>
        <BottomNavigation active="focus" />
      </div>
    );
  }

  // 3秒倒计时UI
  if (state === 'starting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl font-bold text-white mb-4 animate-bounce">
            {countdown > 0 ? countdown : '🎯'}
          </div>
          <p className="text-2xl text-white/90">准备就绪</p>
        </div>
      </div>
    );
  }

  // 专注进行中UI - 黑匣子模式
  if (state === 'running') {
    const totalSeconds = plannedMinutes * 60;
    const progress = Math.min(elapsedTime / totalSeconds, 1);
    const remainingSeconds = Math.max(totalSeconds - elapsedTime, 0);

    // 超额完成检测
    const isOverTime = elapsedTime > totalSeconds;

    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300 ${
        isOverTime ? 'bg-gradient-to-br from-amber-900 to-yellow-900' : 'bg-gradient-to-br from-teal-900 to-cyan-900'
      }`}>
        {/* 小目标和计划信息 */}
        {(selectedGoalInfo || sessionName) && (
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center max-w-2xl px-4">
            {selectedGoalInfo && (
              <p className="text-white/70 text-lg font-medium mb-1">
                正在专注 · {selectedGoalInfo.title}
              </p>
            )}
            {sessionName && (
              <p className="text-white/50 text-sm">
                {sessionName} · 投资中
              </p>
            )}
          </div>
        )}
        
        {/* 中央计时器区域 - PC端优化 */}
        <div className="text-center max-w-md mx-auto flex flex-col items-center">
          <div className={`text-7xl sm:text-8xl md:text-9xl font-bold mb-8 transition-all duration-300 leading-tight ${
            isOverTime ? 'text-yellow-300' : 'text-white'
          }`}>
            {formatTime(isOverTime ? elapsedTime : remainingSeconds)}
          </div>
          
          {isOverTime && (
            <div className="mb-6 text-yellow-300 text-xl animate-pulse">
              ✨ 超额完成中 ✨
            </div>
          )}
          
          {!isOverTime && (
            <p className="text-white/70 text-lg mb-12">
              {Math.floor(progress * 100)}% 完成
            </p>
          )}

          {/* 进度环 - PC端居中优化 */}
          <div className="relative w-48 h-48 mb-12 mx-auto">
            <svg className="transform -rotate-90 w-48 h-48">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-white/20"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress)}`}
                className={`transition-all duration-1000 ${
                  isOverTime ? 'text-yellow-300' : 'text-teal-300'
                }`}
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={pauseFocus}
              disabled={pauseCount >= 1}
              className="px-6 py-3 bg-white/20 text-white rounded-full font-semibold hover:bg-white/30 transition-all backdrop-blur-sm disabled:opacity-30"
            >
              {pauseCount >= 1 ? '暂停已用' : '暂停'}
            </button>
            <button
              onClick={() => endFocus(false)}
              className="px-6 py-3 bg-white/20 text-white rounded-full font-semibold hover:bg-white/30 transition-all backdrop-blur-sm"
            >
              结束
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 暂停状态UI
  if (state === 'paused') {
    const totalSeconds = plannedMinutes * 60;
    const progress = elapsedTime / totalSeconds;
    
    // 计算已暂停时长
    const getPauseDuration = () => {
      if (!pauseStartTime) return 0;
      return Math.floor((new Date().getTime() - pauseStartTime.getTime()) / 1000);
    };
    
    const pauseDuration = getPauseDuration();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl font-bold text-white mb-6">
            {formatTime(elapsedTime)}
          </div>
          
          <p className="text-blue-300 text-sm mb-2">
            已专注时长
          </p>
          <p className="text-blue-200 text-sm mb-8">
            暂停时长: {formatTime(pauseDuration)}
          </p>
          
          <p className="text-blue-200 text-xl mb-8">
            深呼吸，准备好继续了吗？
          </p>

          {/* 进度环 */}
          <div className="relative w-64 h-64 mx-auto mb-8">
            <svg className="transform -rotate-90 w-64 h-64">
              <circle
                cx="128"
                cy="128"
                r="116"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-white/20"
              />
              <circle
                cx="128"
                cy="128"
                r="116"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 116}`}
                strokeDashoffset={`${2 * Math.PI * 116 * (1 - progress)}`}
                className="text-blue-300 transition-all duration-300"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-1">
                  {Math.floor(progress * 100)}%
                </div>
                <div className="text-sm text-blue-200">已完成</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={resumeFocus}
              className="w-full rounded-xl bg-blue-500 px-4 py-4 text-white font-semibold text-lg hover:bg-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              继续专注
            </button>
            <button
              onClick={() => endFocus(false)}
              className="w-full rounded-xl bg-white/20 px-4 py-4 text-white font-semibold text-lg hover:bg-white/30 transition-all backdrop-blur-sm"
            >
              结束专注
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 显示小结页面（优先级最高）
  if (showSummary) {
    return (
      <FocusSummary
        duration={elapsedTime}
        plannedMinutes={plannedMinutes}
        onSave={handleSummarySave}
        onSkip={handleSummarySkip}
      />
    );
  }

  // 完成状态UI
  if (state === 'completed' || state === 'interrupted') {
    const completed = state === 'completed';
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;

    return (
      <>
        {/* 礼花效果 */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10px',
                  width: '12px',
                  height: '12px',
                  background: `hsl(${Math.random() * 360}, 70%, 60%)`,
                  animation: `confetti ${2 + Math.random() * 2}s ease-in-out forwards`,
                  animationDelay: `${Math.random() * 3}s`,
                }}
              />
            ))}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes confetti {
                0% {
                  transform: translateY(0) rotate(0deg);
                  opacity: 1;
                }
                100% {
                  transform: translateY(100vh) rotate(720deg);
                  opacity: 0;
                }
              }
            `}} />
          </div>
        )}

        {/* 如果正在显示选择按钮 */}
        {showEndOptions && !showSummary && (
          <div className={`min-h-screen flex items-center justify-center p-6 bg-gradient-to-br ${
            completed ? 'from-teal-500 to-cyan-600' : 'from-purple-500 to-pink-600'
          }`}>
          <div className="text-center max-w-md w-full">
            <div className="text-6xl mb-6">
              {completed ? '🎉' : '💙'}
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              {completed ? '专注完成！' : '专注记录'}
            </h1>
            <p className="text-white/90 text-xl mb-8">
              已专注 {minutes} 分 {seconds} 秒
            </p>
            
            <div className="space-y-3 mt-8">
              <button
                onClick={openSummary}
                className="w-full rounded-xl bg-yellow-400 px-4 py-4 text-gray-900 font-semibold text-lg hover:bg-yellow-300 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                ✍️ 做个小结
              </button>
              <button
                onClick={goToDashboard}
                className="w-full rounded-xl bg-white px-4 py-4 text-teal-600 font-semibold text-lg hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                返回主页
              </button>
              <button
                onClick={continueFocus}
                className="w-full rounded-xl bg-white/20 px-4 py-4 text-white font-semibold text-lg hover:bg-white/30 transition-all backdrop-blur-sm"
              >
                继续专注
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 显示完成信息 */}
      {!showEndOptions && (
        <div className={`min-h-screen flex items-center justify-center p-6 bg-gradient-to-br ${
          completed ? 'from-teal-500 to-cyan-600' : 'from-purple-500 to-pink-600'
        }`}>
          <div className="text-center">
            <div className="text-6xl mb-6">
              {completed ? '🎉' : '💙'}
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              {completed ? '专注完成！' : '专注记录'}
            </h1>
            <p className="text-white/90 text-xl mb-8">
              {completed 
                ? `你本次专注共持续了 ${minutes} 分 ${seconds} 秒` 
                : `你已专注 ${minutes} 分 ${seconds} 秒`}
            </p>
            <div className="text-white/70">
              {completed 
                ? '这证明你的热爱，比你的计划更加澎湃。' 
                : '意识到自己状态的变化，本身就是一种觉察。'}
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  // 显示小结弹窗
  if (showSummaryModal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FocusSummaryModal
          isOpen={showSummaryModal}
          duration={elapsedTime}
          onClose={handleCloseSummary}
          onSave={handleSaveSummary}
          onSkip={handleCloseSummary}
        />
      </div>
    );
  }

  return null;
}

