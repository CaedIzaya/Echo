import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import BottomNavigation from '../dashboard/BottomNavigation';
import InterruptedSessionAlert from './InterruptedSessionAlert';
import EchoSpirit from '../dashboard/EchoSpirit';
import { trackEvent } from '~/lib/analytics';

// Wake Lock API 类型定义
interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

interface Navigator {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  };
}

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
  elapsedTime: number;      // 已专注时长（秒）- 基于时间戳计算
  status: FocusState;
  startTime: string;        // 开始时间戳（ISO格式）
  pauseStart?: string;      // 暂停开始时间戳
  totalPauseTime: number;   // 累计暂停时间（秒）
  pauseCount: number;
  customDuration: number;   // 用户自定义时长（分钟）
}

const FOCUS_PAUSE_MESSAGE = '休息一下吧，我一直在。';
const FOCUS_AGITATION_MESSAGES = {
  mild: [
    '内心好像轻轻晃了一下，我在。',
    '我看见你的小波动了，别紧张。',
    '你刚才那一下很轻，我接住了。',
  ],
  moderate: [
    '刚刚好像有点难，还好吗？',
    '你现在的节奏有点不稳，我在看着。',
    '这一段不轻松，我听见了。',
  ],
  severe: [
    '如果你还想继续的话，我陪着你。',
    '你不用把它一个人扛完，我在。',
    '这段很重，但你不是一个人。',
  ],
};

const pickRandomMessage = (pool: string[]) => {
  if (!pool.length) return '';
  return pool[Math.floor(Math.random() * pool.length)];
};

type AgitationTier = 0 | 1 | 2 | 3;

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
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [totalPauseTime, setTotalPauseTime] = useState(0); // 累计暂停时间（秒）
  const [showEndOptions, setShowEndOptions] = useState(false);
  const [pauseUpdateTrigger, setPauseUpdateTrigger] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [planMilestones, setPlanMilestones] = useState<Array<{ id: string; title: string; completed: boolean; order: number }>>([]);
  const [customGoals, setCustomGoals] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [showInterruptedAlert, setShowInterruptedAlert] = useState(false);
  const [interruptedSessionData, setInterruptedSessionData] = useState<{ minutes: number; timestamp: string } | null>(null);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [pendingEndCompleted, setPendingEndCompleted] = useState(false);
  const [celebrateMode, setCelebrateMode] = useState<'session' | 'daily' | null>(null);
  const [isLumiHidden, setIsLumiHidden] = useState(false);
  const [focusLumiMessage, setFocusLumiMessage] = useState<string | null>(null);
  const [focusLumiAutoAnimation, setFocusLumiAutoAnimation] = useState<{ token: number; type: 'happy' | 'nod' | 'excited'; durationMs?: number } | null>(null);
  

  // 击掌功能相关状态
  const [highFivePhase, setHighFivePhase] = useState<'none' | 'ready' | 'success' | 'finished'>('none');
  const [highFiveText, setHighFiveText] = useState('');
  const highFiveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const focusLumiMessageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const focusLumiAnimationTokenRef = useRef(0);
  const isLumiHiddenRef = useRef(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<FocusSession | null>(null);
  const isInitialLoadRef = useRef(true);
  const hasPlayedGoalSoundRef = useRef(false); // 标记是否已播放目标达成提示音
  const todayMinutesBeforeStartRef = useRef(0); // 开始本次专注前，今日已累计专注分钟数
  const goldActivatedThisSessionRef = useRef(false); // 本次会话是否已进入金色态
  const hasPlayedTadaSoundRef = useRef(false); // 是否已播放 ta~da 音效
  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null); // Wake Lock 引用
  const autoInterruptedAtKey = 'focusSessionAutoInterruptedAt';
  const focusStateRef = useRef<FocusState>('preparing');
  const agitationScoreRef = useRef(0);
  const agitationTriggeredRef = useRef({ mild: false, moderate: false, severe: false });
  const agitatedDuringSessionRef = useRef(false);
  const agitationDecayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAgitationSignalRef = useRef<Record<string, number>>({});
  const currentAgitationTierRef = useRef<AgitationTier>(0);
  const tierLastNotifyAtRef = useRef<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const lumiHoverTrackerRef = useRef({ count: 0, windowStart: 0 });
  const pendingAgitationComfortRef = useRef(false);
  const mouseTrackerRef = useRef({
    lastX: null as number | null,
    lastY: null as number | null,
    lastTime: 0,
    distance: 0,
    directionChanges: 0,
    lastDx: 0,
    lastDy: 0,
    windowStart: 0,
  });

  const triggerFocusLumiAnimation = (type: 'happy' | 'nod' | 'excited', durationMs: number = 2000) => {
    focusLumiAnimationTokenRef.current += 1;
    setFocusLumiAutoAnimation({ token: focusLumiAnimationTokenRef.current, type, durationMs });
  };

  const showFocusLumiMessage = (
    text: string,
    durationMs: number = 8000,
    animation: 'happy' | 'nod' | 'excited' = 'nod',
  ) => {
    if (!text) return;
    if (isLumiHiddenRef.current) return;

    setFocusLumiMessage(text);
    triggerFocusLumiAnimation(animation);

    if (focusLumiMessageTimerRef.current) {
      clearTimeout(focusLumiMessageTimerRef.current);
      focusLumiMessageTimerRef.current = null;
    }

    if (durationMs > 0) {
      focusLumiMessageTimerRef.current = setTimeout(() => {
        setFocusLumiMessage(null);
      }, durationMs);
    }
  };

  const resetAgitationTracking = () => {
    agitationScoreRef.current = 0;
    agitationTriggeredRef.current = { mild: false, moderate: false, severe: false };
    agitatedDuringSessionRef.current = false;
    lastAgitationSignalRef.current = {};
    currentAgitationTierRef.current = 0;
    tierLastNotifyAtRef.current = { 1: 0, 2: 0, 3: 0 };
    lumiHoverTrackerRef.current = { count: 0, windowStart: 0 };
    pendingAgitationComfortRef.current = false;
    mouseTrackerRef.current = {
      lastX: null,
      lastY: null,
      lastTime: 0,
      distance: 0,
      directionChanges: 0,
      lastDx: 0,
      lastDy: 0,
      windowStart: 0,
    };
    if (agitationDecayTimerRef.current) {
      clearInterval(agitationDecayTimerRef.current);
      agitationDecayTimerRef.current = null;
    }
  };

  const getAgitationTierByScore = (score: number, currentTier: AgitationTier): AgitationTier => {
    if (score >= 115) return 3;
    if (score >= 85) return currentTier >= 2 ? currentTier : 2;
    if (score >= 55) return currentTier >= 1 ? currentTier : 1;

    // 滞后降档，避免阈值附近抖动
    if (currentTier === 3 && score < 95) return 2;
    if (currentTier === 2 && score < 65) return 1;
    if (currentTier === 1 && score < 35) return 0;
    return currentTier;
  };

  const evaluateAgitationThresholds = () => {
    const now = Date.now();
    const score = agitationScoreRef.current;
    const prevTier = currentAgitationTierRef.current;
    const nextTier = getAgitationTierByScore(score, prevTier);
    currentAgitationTierRef.current = nextTier;

    if (nextTier <= prevTier || nextTier === 0) return;

    agitatedDuringSessionRef.current = true;
    const lastNotifyAt = tierLastNotifyAtRef.current[nextTier] || 0;
    if (now - lastNotifyAt < 20000) return;
    tierLastNotifyAtRef.current[nextTier] = now;

    if (nextTier === 3) {
      agitationTriggeredRef.current.severe = true;
      agitationTriggeredRef.current.moderate = true;
      agitationTriggeredRef.current.mild = true;
      pendingAgitationComfortRef.current = true;
      showFocusLumiMessage(pickRandomMessage(FOCUS_AGITATION_MESSAGES.severe), 10000, 'excited');
      return;
    }
    if (nextTier === 2) {
      agitationTriggeredRef.current.moderate = true;
      agitationTriggeredRef.current.mild = true;
      pendingAgitationComfortRef.current = true;
      showFocusLumiMessage(pickRandomMessage(FOCUS_AGITATION_MESSAGES.moderate), 9000, 'happy');
      return;
    }
    if (nextTier === 1) {
      agitationTriggeredRef.current.mild = true;
      pendingAgitationComfortRef.current = true;
      showFocusLumiMessage(pickRandomMessage(FOCUS_AGITATION_MESSAGES.mild), 8000, 'nod');
    }
  };

  const handleAgitationComfortClick = () => {
    if (!pendingAgitationComfortRef.current) return;
    pendingAgitationComfortRef.current = false;
    showFocusLumiMessage('收到，让我们安心继续吧！', 5000, 'nod');
  };

  const registerAgitationSignal = (signal: 'visibility' | 'blur' | 'mouse' | 'hover') => {
    if (focusStateRef.current !== 'running') return;
    const now = Date.now();
    const last = lastAgitationSignalRef.current[signal] || 0;
    const cooldownMs =
      signal === 'mouse'
        ? 5000
        : signal === 'hover'
          ? 4000
          : 2500;
    if (now - last < cooldownMs) return;
    lastAgitationSignalRef.current[signal] = now;

    const delta =
      signal === 'visibility'
        ? 28
        : signal === 'blur'
          ? 20
          : signal === 'mouse'
            ? 14
            : 10;
    agitationScoreRef.current = Math.min(150, agitationScoreRef.current + delta);
    evaluateAgitationThresholds();
  };

  const onLumiHover = () => {
    if (focusStateRef.current !== 'running') return;
    const now = Date.now();
    const tracker = lumiHoverTrackerRef.current;
    if (!tracker.windowStart || now - tracker.windowStart > 10000) {
      tracker.windowStart = now;
      tracker.count = 1;
      return;
    }
    tracker.count += 1;
    if (tracker.count >= 4) {
      registerAgitationSignal('hover');
      tracker.count = 0;
      tracker.windowStart = now;
    }
  };

  useEffect(() => {
    focusStateRef.current = state;
  }, [state]);

  useEffect(() => {
    isLumiHiddenRef.current = isLumiHidden;
  }, [isLumiHidden]);

  useEffect(() => {
    if (state !== 'running') return;

    const handleBlur = () => registerAgitationSignal('blur');
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        registerAgitationSignal('visibility');
      }
    };
    const handleMouseMove = (event: MouseEvent) => {
      const tracker = mouseTrackerRef.current;
      const now = Date.now();
      if (!tracker.windowStart) tracker.windowStart = now;
      if (tracker.lastX !== null && tracker.lastY !== null) {
        const dx = event.clientX - tracker.lastX;
        const dy = event.clientY - tracker.lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        tracker.distance += dist;

        const dot = dx * tracker.lastDx + dy * tracker.lastDy;
        if ((tracker.lastDx !== 0 || tracker.lastDy !== 0) && dot < 0) {
          tracker.directionChanges += 1;
        }
        tracker.lastDx = dx;
        tracker.lastDy = dy;
      }
      tracker.lastX = event.clientX;
      tracker.lastY = event.clientY;
      tracker.lastTime = now;

      if (now - tracker.windowStart >= 6000) {
        if (tracker.distance > 4200 || tracker.directionChanges > 18) {
          registerAgitationSignal('mouse');
        }
        tracker.distance = 0;
        tracker.directionChanges = 0;
        tracker.windowStart = now;
      }
    };

    agitationDecayTimerRef.current = setInterval(() => {
      if (focusStateRef.current !== 'running') return;
      const current = agitationScoreRef.current;
      const decay = current >= 100 ? 4 : current >= 50 ? 6 : 8;
      agitationScoreRef.current = Math.max(0, current - decay);
      evaluateAgitationThresholds();
    }, 4000);

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('mousemove', handleMouseMove);
      if (agitationDecayTimerRef.current) {
        clearInterval(agitationDecayTimerRef.current);
        agitationDecayTimerRef.current = null;
      }
    };
  }, [state]);

  useEffect(() => {
    return () => {
      if (focusLumiMessageTimerRef.current) {
        clearTimeout(focusLumiMessageTimerRef.current);
        focusLumiMessageTimerRef.current = null;
      }
      if (agitationDecayTimerRef.current) {
        clearInterval(agitationDecayTimerRef.current);
        agitationDecayTimerRef.current = null;
      }
    };
  }, []);

  // 播放温柔的成就提示音
  const playGoalAchievementSound = () => {
    try {
      // 创建 AudioContext（如果不存在）
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;

      // 如果 AudioContext 被暂停，恢复它（浏览器要求用户交互后才能播放音频）
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {
          console.warn('AudioContext 恢复失败，可能需要用户交互');
        });
      }

      // 创建一个温柔的上行音阶（C-D-E-F-G），带有成就感和成功的感觉
      // 使用更低的频率，声音更温柔：C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00
      const frequencies = [261.63, 293.66, 329.63, 349.23, 392.00];
      const duration = 0.12; // 每个音符持续时间（秒），稍快一点更轻快
      const baseTime = audioContext.currentTime + 0.1; // 稍微延迟，确保 AudioContext 已准备好

      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // 使用正弦波，声音更柔和温柔
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;

        // 音量包络：渐入渐出，更温柔
        const startTime = baseTime + index * duration;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.03); // 快速渐入（音量较低，更温柔）
        gainNode.gain.linearRampToValueAtTime(0.12, startTime + duration - 0.03); // 保持
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // 渐出

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });

      console.log('🎵 播放目标达成提示音（温柔版）');
    } catch (error) {
      console.warn('播放提示音失败（可能需要用户交互）:', error);
    }
  };

  // 播放 Ta~da 庆祝音效
  const playTadaSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;

      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {
          console.warn('AudioContext 恢复失败');
        });
      }

      // Ta~da 音效：欢快的上行三和弦 C-E-G-C (261.63, 329.63, 392.00, 523.25)
      const frequencies = [261.63, 329.63, 392.00, 523.25];
      const duration = 0.15;
      const baseTime = audioContext.currentTime + 0.05;

      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = freq;

        const startTime = baseTime + index * duration;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + duration - 0.02);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });

      console.log('🎉 播放 Ta~da 庆祝音效');
    } catch (error) {
      console.warn('播放庆祝音效失败:', error);
    }
  };

  // 播放 叮~ 击掌音效
  const playDingSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }

      // 叮~ 清脆的高音
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 880; // A5

      const startTime = audioContext.currentTime;
      const duration = 0.3;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    } catch (e) {
      console.warn('播放音效失败', e);
    }
  };

  // 处理击掌交互
  const handleHighFiveClick = () => {
    if (highFivePhase !== 'ready') return;
    
    playDingSound();
    setHighFivePhase('success');
    setHighFiveText('太棒了！你这次超亮！');
    
    // 5秒后进入平稳状态
    if (highFiveTimerRef.current) clearTimeout(highFiveTimerRef.current);
    highFiveTimerRef.current = setTimeout(() => {
      setHighFivePhase('finished');
      setHighFiveText(''); // 文案消失
    }, 5000);
  };
  
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
      .filter(m => !m.completed) // 确保只显示未完成的
      .map(m => ({ 
        id: m.id, 
        title: m.title, 
        completed: false // 计划中的小目标总是未完成的（已完成的已被过滤）
      })), 
    ...customGoals
  ];

  const getSelectedPlan = () =>
    selectedPlanId !== 'free'
      ? availablePlans.find(p => p.id === selectedPlanId)
      : null;

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
      setSessionName(mockPlans.name);
      setPlannedMinutes(30);
    setCustomDuration(30);
      // 自由时间：清空计划小目标，只显示自定义
      setPlanMilestones([]);
      setCustomGoals([]);
    } else {
      const plan = availablePlans.find(p => p.id === value);
      if (plan) {
        setSessionName(plan.name);
        setPlannedMinutes(plan.dailyGoalMinutes || 30);
      setCustomDuration(plan.dailyGoalMinutes || 30);
        
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
    const loadPlans = (shouldResetSelection: boolean = false) => {
      console.log('🔄 重新加载计划数据...', { shouldResetSelection });
      // 加载可用计划 - 过滤掉已完成的计划
      const allPlans = JSON.parse(localStorage.getItem('userPlans') || '[]');
      const activePlans = allPlans.filter((p: any) => !p.isCompleted);
      setAvailablePlans(activePlans);
      const primary = activePlans.find((p:any) => p.isPrimary);
      
      // 只有在初始加载或shouldResetSelection为true时才重置计划选择
      if (shouldResetSelection || isInitialLoadRef.current) {
        // 🌟 检查是否是快速启动模式
        const urlParams = new URLSearchParams(window.location.search);
        const isQuickStart = urlParams.get('quickStart') === 'true';
        const durationParam = urlParams.get('duration');
        
        if (primary) {
          setSelectedPlanId(primary.id);
          setSessionName(primary.name);
          const targetDuration = durationParam ? parseInt(durationParam) : (primary.dailyGoalMinutes || 30);
          setPlannedMinutes(targetDuration);
          setCustomDuration(targetDuration);
          // 加载主要计划的小目标 - 过滤已完成的目标
          if (primary.milestones) {
            console.log('📋 加载小目标，总数:', primary.milestones.length);
            const uncompleted = primary.milestones.filter((m: any) => !m.isCompleted);
            console.log('✅ 未完成的小目标:', uncompleted.length);
            setPlanMilestones(uncompleted);
          }
          
          // 🌟 如果是快速启动，自动选中今日目标（如果有）
          if (isQuickStart) {
            const todayGoalId = localStorage.getItem('todaySelectedGoalId');
            const todayGoalDate = localStorage.getItem('todaySelectedGoalDate');
            const today = new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).replace(/\//g, '-');
            
            if (todayGoalId && todayGoalDate === today && primary.milestones) {
              const todayGoal = primary.milestones.find((m: any) => m.id === todayGoalId);
              if (todayGoal && !todayGoal.isCompleted) {
                setSelectedGoal(todayGoalId);
                console.log('📌 快速启动，自动选中今日目标:', todayGoal.title);
              }
            }
          }
        } else {
          setSelectedPlanId('free');
          setSessionName(mockPlans.name);
          const targetDuration = durationParam ? parseInt(durationParam) : 15;
          setPlannedMinutes(targetDuration);
          setCustomDuration(targetDuration);
          setPlanMilestones([]);
        }
        isInitialLoadRef.current = false; // 标记已完成初始加载
      }
      
      // 🌟 返回是否是快速启动模式
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('quickStart') === 'true';
    };

    // 初始加载
    const isQuickStart = loadPlans();
    
    // 🌟 如果是快速启动，延迟后自动开始倒计时
    if (isQuickStart) {
      console.log('⚡ 快速启动模式，准备自动开始...');
      const timer = setTimeout(() => {
        if (state === 'preparing' && sessionRef.current) {
          console.log('⚡ 快速启动 - 自动开始倒计时');
          startFocus();
        }
      }, 800); // 延迟800ms确保数据加载完成
      
      return () => clearTimeout(timer);
    }
    
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
        loadPlans(false); // 不重置选择，只更新计划列表
      }
    };

    // 监听页面可见性变化（从dashboard返回时重新加载）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 检查是否有意外中断的会话需要恢复
        const autoInterruptedAt = localStorage.getItem(autoInterruptedAtKey);
        if (autoInterruptedAt && sessionRef.current && (sessionRef.current.status === 'running' || sessionRef.current.status === 'paused')) {
          console.log('🔔 检测到意外中断的会话，准备恢复...');
          // 会在恢复逻辑中处理
        }
        
        // 如果页面变为可见且不在运行状态，重新加载计划数据
        if (state === 'preparing') {
          console.log('🔔 页面可见，重新加载计划数据...');
          loadPlans(false); // 不重置选择，只更新计划列表
        } else if (state !== 'running' && state !== 'paused') {
          // 如果页面从隐藏变为可见且不在运行状态，重置到准备状态
          console.log('🔄 检测到页面状态变化，重置会话');
          localStorage.removeItem('focusSession');
          setElapsedTime(0);
          setState('preparing');
          setShowEndOptions(false);
          // 重新初始化
          const newSession: FocusSession = {
            sessionId: `focus_${Date.now()}`,
            plannedDuration: plannedMinutes,
            elapsedTime: 0,
            status: 'preparing',
            startTime: new Date().toISOString(),
            pauseCount: 0,
            totalPauseTime: 0,
            customDuration: plannedMinutes
          };
          sessionRef.current = newSession;
          // 重新加载计划数据（需要重置选择）
          loadPlans(true);
        }
      } else if (document.visibilityState === 'hidden') {
        // 页面隐藏时，如果正在专注，标记为意外中断
        if (state === 'running' || state === 'paused') {
          console.log('💾 页面隐藏，标记意外中断时间');
          localStorage.setItem(autoInterruptedAtKey, new Date().toISOString());
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 每2秒检查一次计划数据是否有变化（备用机制）
    const interval = setInterval(() => {
      if (state === 'preparing') {
        loadPlans(false); // 不重置用户的选择，只更新计划列表
      }
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [state, mockPlans.date]);

  // 同步用户设定的专注时长到会话存储
  useEffect(() => {
    if (state !== 'preparing') return;
    if (!sessionRef.current) return;

    sessionRef.current.plannedDuration = plannedMinutes;
    sessionRef.current.customDuration = plannedMinutes;
    saveState({
      plannedDuration: plannedMinutes,
      customDuration: plannedMinutes
    });
  }, [plannedMinutes, state]);


  // 从localStorage恢复状态 - 增强版恢复机制
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isQuickStart = urlParams.get('quickStart') === 'true';

    // 快速启动时，始终以全新会话开始，避免旧会话覆盖目标时长
    if (isQuickStart) {
      localStorage.removeItem('focusSession');
      localStorage.removeItem('focusSessionEnded');
      localStorage.removeItem('focusTimerLastSaved');
      localStorage.removeItem(autoInterruptedAtKey);
    }

    const saved = isQuickStart ? null : localStorage.getItem('focusSession');
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
        
        // 检查是否有意外中断标记
        const autoInterruptedAt = localStorage.getItem(autoInterruptedAtKey);
        if (
          autoInterruptedAt &&
          (session.status === 'running' || session.status === 'paused')
        ) {
          const recordedSeconds =
            typeof session.elapsedTime === 'number' && session.elapsedTime > 0
              ? session.elapsedTime
              : 0;
          const recordedMinutes = Math.floor(recordedSeconds / 60);

          if (recordedMinutes > 0) {
            try {
              // 优先调用 dashboard 回调（如果存在）
              if (typeof window !== 'undefined' && (window as any).reportFocusSessionComplete) {
                (window as any).reportFocusSessionComplete(recordedMinutes, undefined, false, session.plannedDuration);
              } else {
                // 兜底：直接写入本地累计
                const today = new Date().toISOString().split('T')[0];
                const todayStatsData = localStorage.getItem('todayStats');
                const allTodayStats = todayStatsData ? JSON.parse(todayStatsData) : {};
                const currentTodayMinutes = allTodayStats[today]?.minutes || 0;
                allTodayStats[today] = { minutes: currentTodayMinutes + recordedMinutes, date: today };
                localStorage.setItem('todayStats', JSON.stringify(allTodayStats));

                const weeklyData = localStorage.getItem('weeklyStats');
                const weeklyStats = weeklyData ? JSON.parse(weeklyData) : { totalMinutes: 0, weekStart: today };
                weeklyStats.totalMinutes = (weeklyStats.totalMinutes || 0) + recordedMinutes;
                localStorage.setItem('weeklyStats', JSON.stringify(weeklyStats));
              }
            } catch (e) {
              console.error('❌ 意外中断：记录专注时长失败:', e);
            }

            setInterruptedSessionData({
              minutes: recordedMinutes,
              timestamp: autoInterruptedAt,
            });
            setShowInterruptedAlert(true);
          }

          // 清理会话，回到准备态
          localStorage.removeItem('focusSession');
          localStorage.removeItem('focusSessionEnded');
          localStorage.removeItem('focusTimerLastSaved');
          localStorage.removeItem(autoInterruptedAtKey);
          setElapsedTime(0);
          setState('preparing');
          return;
        }
        
        const startTime = session.startTime;
        const totalPauseTime = session.totalPauseTime || 0;
        
        // 使用基于时间戳的方式计算已专注时长
        const restoredElapsedTime = calculateElapsedTime(
          startTime,
          totalPauseTime,
          session.status === 'paused',
          session.pauseStart
        );
        
        console.log('🔄 恢复专注状态', {
          startTime,
          totalPauseTime,
          restoredElapsedTime: Math.floor(restoredElapsedTime / 60) + '分钟',
          goal: session.plannedDuration + '分钟'
        });
        
        // 如果距离开始时间在24小时内
        const now = new Date();
        const startTimeObj = new Date(startTime);
        const totalDiff = Math.floor((now.getTime() - startTimeObj.getTime()) / 1000);
        
        if (totalDiff < 24 * 3600) {
          sessionRef.current = session;
          setElapsedTime(restoredElapsedTime);
          setTotalPauseTime(totalPauseTime);
          setPlannedMinutes(session.plannedDuration);
          setCustomDuration(session.customDuration);
          setPauseCount(session.pauseCount);
          
          // 检查是否超过24小时未返回
          const hoursDiff = totalDiff / 3600;
          if (hoursDiff >= 24) {
            console.log('⏰ 专注会话已过期（超过24小时），清理状态并记录已专注时间');
            
            // 使用基于时间戳的方式计算最终已专注时间
            const finalElapsed = calculateElapsedTime(
              session.startTime,
              session.totalPauseTime || 0,
              false
            );
            const recordedMinutes = Math.floor(finalElapsed / 60);
            if (recordedMinutes > 0 && typeof window !== 'undefined' && (window as any).reportFocusSessionComplete) {
              console.log('📊 记录意外退出的专注时长', { minutes: recordedMinutes });
              
              // 记录到dashboard
              (window as any).reportFocusSessionComplete(recordedMinutes, undefined, false);
              
              // 显示意外结束提示
              setInterruptedSessionData({
                minutes: recordedMinutes,
                timestamp: session.startTime
              });
              setShowInterruptedAlert(true);
              
              // 清理过期会话
              localStorage.removeItem('focusSession');
              localStorage.removeItem('focusSessionEnded');
              localStorage.removeItem('focusTimerLastSaved');
              setState('preparing');
              return;
            }
            
            // 清理过期会话
            localStorage.removeItem('focusSession');
            localStorage.removeItem('focusSessionEnded');
            localStorage.removeItem('focusTimerLastSaved');
            setState('preparing');
            return;
          }
          
          // 恢复状态
          if (session.status === 'running') {
            console.log('▶️ 恢复运行状态');
            setState('running');
            
            // 启动基于时间戳的计时器
            if (intervalRef.current === null) {
              // 延迟启动，避免重复
              setTimeout(() => {
                // 再次检查，防止重复
                if (intervalRef.current !== null) {
                  console.log('⚠️ 计时器已在运行，跳过重复启动');
                  return;
                }
                
                console.log('▶️ 启动基于时间戳的计时器');
                beginFocus(); // 使用新的 beginFocus 函数
              }, 500);
            } else {
              console.log('⚠️ 已有计时器在运行，跳过重复启动');
            }
            
            // 显示恢复通知
            console.log('✅ 已恢复专注计时器', { 
              elapsed: Math.floor(restoredElapsedTime / 60) + '分钟',
              goal: session.plannedDuration + '分钟'
            });
          } else if (session.status === 'paused') {
            console.log('⏸️ 恢复暂停状态');
            setState('paused');
            setIsPaused(true);
            if (session.pauseStart) {
              setPauseStartTime(new Date(session.pauseStart));
            }
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
          localStorage.removeItem('focusSessionEnded');
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
        totalPauseTime: 0,
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
      setShowConfetti(false);
      setPauseCount(0);
      setIsPaused(false);
      setCountdown(3);
      setTotalPauseTime(0);
      // 重置提示音播放标记
      hasPlayedGoalSoundRef.current = false;
      todayMinutesBeforeStartRef.current = 0;
      goldActivatedThisSessionRef.current = false;
      hasPlayedTadaSoundRef.current = false;
      setCelebrateMode(null);
    }
  }, [state]);

  // 监听专注时长变化，检测是否达到目标时长并播放提示音
  useEffect(() => {
    if (state === 'running' && plannedMinutes > 0 && sessionRef.current) {
      const currentElapsed = calculateElapsedTime(
        sessionRef.current.startTime,
        sessionRef.current.totalPauseTime || 0,
        false
      );
      const totalSeconds = plannedMinutes * 60;
      const isOverTime = currentElapsed >= totalSeconds; // 使用 >= 确保精确触发
      
      // 检测是否刚达到目标时长（从未达到变为达到）
      if (isOverTime && !hasPlayedGoalSoundRef.current) {
        hasPlayedGoalSoundRef.current = true;
        // 延迟一点播放，确保界面已经变成金色
        setTimeout(() => {
          playGoalAchievementSound();
        }, 100);
      } else if (currentElapsed < totalSeconds - 1) {
        // 如果还没达到目标（留1秒缓冲），重置标记（允许重新播放，以防用户重新开始）
        hasPlayedGoalSoundRef.current = false;
      }
    } else if (state !== 'running') {
      // 不在运行状态时，重置标记
      hasPlayedGoalSoundRef.current = false;
    }
  }, [elapsedTime, state, plannedMinutes]);


  // 清理计时器
  const cleanupInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 请求屏幕常亮（Wake Lock API）
  const requestWakeLock = async () => {
    // 检查浏览器是否支持 Wake Lock API
    if ('wakeLock' in navigator) {
      try {
        // 请求屏幕常亮
        const wakeLock = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current = wakeLock;
        console.log('✅ 屏幕常亮已启用');
        
        // 监听 Wake Lock 释放事件（比如用户切换应用或系统自动释放）
        wakeLock.addEventListener('release', () => {
          console.log('⚠️ 屏幕常亮已被释放');
          wakeLockRef.current = null;
        });
      } catch (err: any) {
        // 如果请求失败（比如用户拒绝或浏览器不支持），静默处理
        console.warn('无法启用屏幕常亮:', err.message);
        wakeLockRef.current = null;
      }
    } else {
      console.log('⚠️ 浏览器不支持 Wake Lock API');
    }
  };

  // 释放屏幕常亮
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('✅ 屏幕常亮已释放');
      } catch (err) {
        console.warn('释放屏幕常亮失败:', err);
      }
    }
  };

  // 基于时间戳计算已专注时长（避免后台挂起时计时不准）
  const calculateElapsedTime = (startTimeStr: string, totalPause: number, isCurrentlyPaused: boolean, pauseStartStr?: string): number => {
    if (!startTimeStr) return 0;
    
    const startTime = new Date(startTimeStr).getTime();
    const now = new Date().getTime();
    
    // 计算总经过时间
    let totalElapsed = Math.floor((now - startTime) / 1000);
    
    // 减去累计暂停时间
    totalElapsed -= totalPause;
    
    // 如果当前正在暂停，减去当前暂停时长
    if (isCurrentlyPaused && pauseStartStr) {
      const pauseStart = new Date(pauseStartStr).getTime();
      const currentPauseTime = Math.floor((now - pauseStart) / 1000);
      totalElapsed -= currentPauseTime;
    }
    
    return Math.max(0, totalElapsed);
  };

  // 获取今日已专注分钟数
  const getTodayFocusedMinutes = (): number => {
    if (typeof window === 'undefined') return 0;
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayStatsData = localStorage.getItem('todayStats');
      const allTodayStats = todayStatsData ? JSON.parse(todayStatsData) : {};
      return allTodayStats[today]?.minutes || 0;
    } catch {
      return 0;
    }
  };

  // 开始专注流程
  const startFocus = () => {
    if (!sessionRef.current) return;
    
    // 记录本次开始前的"今日累计专注分钟"，用于累计达标判断
    todayMinutesBeforeStartRef.current = getTodayFocusedMinutes();
    // 新会话开始：本次金色与提示音从未触发
    goldActivatedThisSessionRef.current = false;
    hasPlayedGoalSoundRef.current = false;
    hasPlayedTadaSoundRef.current = false;
    
    // 以用户当前设置为准更新计划时长
    sessionRef.current.plannedDuration = plannedMinutes;
    sessionRef.current.customDuration = plannedMinutes;
    saveState({
      plannedDuration: plannedMinutes,
      customDuration: plannedMinutes
    });

    const selectedPlan = getSelectedPlan();
    const goalMinutes =
      selectedPlanId !== 'free'
        ? (selectedPlan?.dailyGoalMinutes ?? plannedMinutes)
        : 30;
    trackEvent({
      name: 'focus_start',
      feature: 'focus',
      page: '/focus',
      action: 'start',
      properties: {
        projectId: selectedPlanId !== 'free' ? selectedPlanId : null,
        plannedMinutes,
        goalMinutes,
      },
    });

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
    
    // 预生成「今日专注文案」，供 Dashboard / 小结页预填使用
    try {
      const today = new Date().toISOString().split('T')[0];
      const parts: string[] = [];
      if (sessionName) parts.push(sessionName);
      if (selectedGoalInfo?.title) parts.push(selectedGoalInfo.title);
      const focusText = parts.join(' · ');
      if (focusText) {
        localStorage.setItem('todayFocusCopy', JSON.stringify({ date: today, text: focusText }));
      }
    } catch (e) {
      console.warn('保存今日专注文案失败', e);
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
    
    // 检查是否已有计时器在运行，防止重复启动
    if (intervalRef.current !== null) {
      console.log('⚠️ 计时器已在运行，跳过重复启动');
      return;
    }
    
    // 清理可能存在的旧计时器
    cleanupInterval();
    resetAgitationTracking();
    
    // 如果是新开始，记录开始时间
    if (!sessionRef.current.startTime || sessionRef.current.status === 'preparing') {
      const startTime = new Date().toISOString();
      sessionRef.current.startTime = startTime;
      sessionRef.current.totalPauseTime = 0;
      saveState({ 
        status: 'running',
        startTime,
        totalPauseTime: 0
      });
    } else {
      // 恢复时，确保状态更新
      saveState({ 
        status: 'running'
      });
    }
    
    setState('running');
    
    // 开始计时（基于时间戳的实时计算）
    if (intervalRef.current === null) {
      intervalRef.current = setInterval(() => {
        if (!sessionRef.current) {
          cleanupInterval();
          return;
        }
        
        // 基于时间戳实时计算已专注时长
        const calculatedTime = calculateElapsedTime(
          sessionRef.current.startTime,
          sessionRef.current.totalPauseTime || 0,
          false
        );
        
        setElapsedTime(calculatedTime);
        saveState({ elapsedTime: calculatedTime });
        
        // 检查是否达到本次设定的目标时长（触发金色背景）
        if (calculatedTime >= plannedMinutes * 60 && !goldActivatedThisSessionRef.current) {
          // 本次专注达到设定时长，激活金色背景
          goldActivatedThisSessionRef.current = true;
          
          // 播放温柔的提示音（仅播放一次）
          if (!hasPlayedGoalSoundRef.current && plannedMinutes > 0) {
            hasPlayedGoalSoundRef.current = true;
            playGoalAchievementSound();
          }
        }
      }, 100); // 每100ms更新一次，确保显示流畅
    }
  };

  // 暂停专注
  const pauseFocus = () => {
    if (!sessionRef.current || pauseCount >= 1) return;
    
    // 立即停止计时器
    cleanupInterval();
    
    // 计算当前已专注时长并保存
    const currentElapsed = calculateElapsedTime(
      sessionRef.current.startTime,
      sessionRef.current.totalPauseTime || 0,
      false
    );
    
    // 立即更新 React state，确保 UI 显示正确时间
    setElapsedTime(currentElapsed);
    
    // 记录暂停开始时间
    const now = new Date();
    const pauseStartStr = now.toISOString();
    setPauseStartTime(now);
    setIsPaused(true);
    setPauseCount(prev => prev + 1);
    setState('paused');
    
    saveState({ 
      status: 'paused',
      pauseStart: pauseStartStr,
      pauseCount: pauseCount + 1,
      elapsedTime: currentElapsed
    });

    // 暂停时的小精灵反应（若用户已隐藏 Lumi，则不会触发）
    showFocusLumiMessage(FOCUS_PAUSE_MESSAGE, 8000, 'nod');
  };

  // 恢复专注（含跨日处理）
  const resumeFocus = () => {
    if (!sessionRef.current || !isPaused) return;
    
    // 跨日暂停处理：如果暂停开始日期 ≠ 当前日期，则归档旧会话，开启新会话
    try {
      if (sessionRef.current.pauseStart) {
        const pauseStartDate = new Date(sessionRef.current.pauseStart).toISOString().split('T')[0];
        const nowDate = new Date().toISOString().split('T')[0];
        
        if (pauseStartDate !== nowDate) {
          console.log('🌅 检测到跨日暂停，归档旧会话并开启新会话');
          
          // 计算暂停前的已专注时长（归入旧日期）
          const oldElapsed = calculateElapsedTime(
            sessionRef.current.startTime,
            sessionRef.current.totalPauseTime || 0,
            false
          );
          const oldMinutes = Math.floor(oldElapsed / 60);
          
          // 归档旧会话到旧日期
          if (oldMinutes > 0 && typeof window !== 'undefined' && (window as any).reportFocusSessionComplete) {
            (window as any).reportFocusSessionComplete(oldMinutes, undefined, false, sessionRef.current.plannedDuration);
          }
          
          // 清理旧会话
          localStorage.removeItem('focusTimerLastSaved');
          localStorage.removeItem('focusSession');
          
          const nowIso = new Date().toISOString();
          const newSession: FocusSession = {
            sessionId: `focus_${Date.now()}`,
            plannedDuration: plannedMinutes,
            elapsedTime: 0,
            status: 'running',
            startTime: nowIso,
            pauseCount: 0,
            totalPauseTime: 0,
            customDuration: plannedMinutes,
          };
          sessionRef.current = newSession;
          localStorage.setItem('focusSession', JSON.stringify(newSession));
          
          setElapsedTime(0);
          setTotalPauseTime(0);
          setPauseCount(0);
          setIsPaused(false);
          setPauseStartTime(null);
          setState('running');
          
          // 今日累计基线：只算今天（不含昨日）
          todayMinutesBeforeStartRef.current = getTodayFocusedMinutes();
          goldActivatedThisSessionRef.current = false;
          hasPlayedGoalSoundRef.current = false;
          hasPlayedTadaSoundRef.current = false;
          
          beginFocus();
          return;
        }
      }
    } catch (e) {
      console.warn('跨日恢复处理失败，回退到默认恢复逻辑', e);
    }
    
    // 计算暂停期间的时间并累加到 totalPauseTime
    if (pauseStartTime && sessionRef.current.pauseStart) {
      const pauseStart = new Date(sessionRef.current.pauseStart).getTime();
      const pauseEnd = new Date().getTime();
      const pauseDuration = Math.floor((pauseEnd - pauseStart) / 1000);
      
      const newTotalPauseTime = (sessionRef.current.totalPauseTime || 0) + pauseDuration;
      setTotalPauseTime(newTotalPauseTime);
      sessionRef.current.totalPauseTime = newTotalPauseTime;
      sessionRef.current.pauseStart = undefined;
    }
    
    setState('running');
    setIsPaused(false);
    setPauseStartTime(null);
    
    saveState({ 
      status: 'running',
      totalPauseTime: sessionRef.current.totalPauseTime,
      pauseStart: undefined
    });
    
    beginFocus();
  };

  // 结束专注
  const endFocus = (completedForStats: boolean = false, celebrateDaily: boolean = false) => {
    // 立即停止所有计时器（彻底清理）
    cleanupInterval();
    
    // 再次确保清除
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (!sessionRef.current) return;
    
    // 使用基于时间戳的方式计算最终已专注时间（确保准确）
    const finalElapsedTime = calculateElapsedTime(
      sessionRef.current.startTime,
      sessionRef.current.totalPauseTime || 0,
      false
    );
    
    // 立即更新 React state，确保 UI 显示正确时间
    setElapsedTime(finalElapsedTime);
    
    // 保存最终状态 - 标记为完成或中断，时间被冻结
    const shouldCelebrate = completedForStats || celebrateDaily;
    const finalState: FocusState = shouldCelebrate ? 'completed' : 'interrupted';
    const finalSession: FocusSession = {
      ...sessionRef.current,
      status: finalState,
      elapsedTime: finalElapsedTime
    };
    saveState(finalSession);
    
    // 标记会话已结束，防止恢复
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusSessionEnded', 'true');
    }
    
    // 如果要庆祝（本次完成 or 今日达标），设置标记以便dashboard显示祝贺文案
    // 成功完成覆盖心烦意乱判定：不写入 focusEndReason
    if (shouldCelebrate && finalElapsedTime > 0) {
      localStorage.setItem('focusCompleted', 'true');
      localStorage.removeItem('focusEndReason');
    } else if (finalElapsedTime > 0) {
      // 未成功完成：根据是否触发过心烦意乱写入不同原因
      if (agitatedDuringSessionRef.current) {
        localStorage.setItem('focusEndReason', 'agitated_end');
      } else {
        localStorage.setItem('focusEndReason', 'early_end');
      }
    }
    
    // 记录本次结算模式（用于结算页文案）
    if (shouldCelebrate) {
      setCelebrateMode(completedForStats ? 'session' : 'daily');
    } else {
      setCelebrateMode(null);
    }

    // 报告专注时长到dashboard（无论是完成还是中断都记录）
    if (finalElapsedTime > 0) {
      const minutes = Math.floor(finalElapsedTime / 60);
      const status = completedForStats ? '✅ 完成' : '⚠️ 中断';
      
      console.log('📊 准备报告专注时长', { 
        status,
        minutes, 
        finalElapsedTime,
        hasFunction: typeof (window as any).reportFocusSessionComplete 
      });
      
      // 获取用户评分（如果有，且仅"本次完成"时）- 保留用于心流指数计算
      const rating = completedForStats ? localStorage.getItem('lastFocusRating') : null;
      const numericRating = rating ? parseFloat(rating) : undefined;
      const selectedPlan = getSelectedPlan();
      const goalMinutes =
        selectedPlanId !== 'free'
          ? (selectedPlan?.dailyGoalMinutes ?? plannedMinutes)
          : 30;
      const isMinMet = minutes >= goalMinutes;
      
      // 🔥 保存到数据库（用于周报统计）
      if (session?.user?.id && sessionRef.current?.startTime) {
        const startTime = new Date(sessionRef.current.startTime);
        const endTime = new Date(startTime.getTime() + finalElapsedTime * 1000);
        
        console.log('💾 保存专注会话到数据库', {
          userId: session.user.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: minutes,
          rating: numericRating,
        });
        
        fetch('/api/focus-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: minutes,
            note: sessionName || null,
            rating: numericRating,
            flowIndex: numericRating,
            projectId: selectedPlanId !== 'free' ? selectedPlanId : null, // ✅ 修复：使用计划ID而不是小目标ID
            goalMinutes,
            isMinMet,
          }),
        }).then(response => {
          if (response.ok) {
            console.log('✅ 专注会话已保存到数据库');
          } else {
            console.error('❌ 保存专注会话失败', response.status);
          }
        }).catch(error => {
          console.error('❌ 保存专注会话网络错误', error);
        });
      }

      trackEvent({
        name: completedForStats ? 'focus_complete' : 'focus_interrupt',
        feature: 'focus',
        page: '/focus',
        action: completedForStats ? 'complete' : 'interrupt',
        properties: {
          projectId: selectedPlanId !== 'free' ? selectedPlanId : null,
          durationMinutes: minutes,
          goalMinutes,
          isMinMet,
          rating: numericRating,
          completedForStats,
        },
      });
      
      // 调用dashboard的回调函数更新统计数据
      if (typeof window !== 'undefined' && (window as any).reportFocusSessionComplete) {
        console.log('✅ 调用 reportFocusSessionComplete', { 
          minutes, 
          completed: completedForStats,
          numericRating 
        });
        (window as any).reportFocusSessionComplete(minutes, numericRating, completedForStats, plannedMinutes);
      } else {
        console.warn('⚠️ reportFocusSessionComplete 函数不存在，使用备用方案');
        
        // 备用方案：直接更新新的数据结构
        try {
          // 更新今日数据
          const today = new Date().toISOString().split('T')[0];
          const todayStatsData = localStorage.getItem('todayStats');
          const allTodayStats = todayStatsData ? JSON.parse(todayStatsData) : {};
          const currentTodayMinutes = allTodayStats[today]?.minutes || 0;
          allTodayStats[today] = { minutes: currentTodayMinutes + minutes, date: today };
          localStorage.setItem('todayStats', JSON.stringify(allTodayStats));
          
          // 更新本周数据
          const weeklyData = localStorage.getItem('weeklyStats');
          const weeklyStats = weeklyData ? JSON.parse(weeklyData) : { totalMinutes: 0, weekStart: today };
          weeklyStats.totalMinutes = (weeklyStats.totalMinutes || 0) + minutes;
          localStorage.setItem('weeklyStats', JSON.stringify(weeklyStats));
          
          console.log('📦 备用方案：已直接更新localStorage', {
            todayMinutes: currentTodayMinutes + minutes,
            weeklyTotal: weeklyStats.totalMinutes
          });
        } catch (e) {
          console.error('❌ 更新统计数据失败:', e);
        }
      }
    }
    
    // 本次完成且"金色态（本次设定时长达成）"时，点击结束播放 ta~da~（只播放一次）
    if (completedForStats && goldActivatedThisSessionRef.current && plannedMinutes > 0 && !hasPlayedTadaSoundRef.current) {
      hasPlayedTadaSoundRef.current = true;
      playTadaSound();
    }

    // 显示礼花效果（本次完成 或 今日达标庆祝）
    if (shouldCelebrate) {
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

  // 当显示结算选项且是已完成状态时，初始化击掌交互
  useEffect(() => {
    if (showEndOptions && state === 'completed' && highFivePhase === 'none') {
      setHighFivePhase('ready');
      setHighFiveText('干得漂亮！来击个掌吧！');
    }
  }, [showEndOptions, state, highFivePhase]);

  // 返回主页
  const goToDashboard = () => {
    // 清理所有状态和标志
    setHighFivePhase('none');
    setHighFiveText('');
    localStorage.removeItem('focusSession');
    localStorage.removeItem('focusSessionEnded');
    localStorage.removeItem('focusTimerLastSaved');
    setElapsedTime(0);
    setState('preparing');
    setShowEndOptions(false);
    setShowConfetti(false);
    cleanupInterval(); // 确保停止所有计时器
    
    // 🔥 标记专注完成和需要刷新数据
    if (state === 'completed') {
      localStorage.setItem('justCompletedFocusAt', Date.now().toString());
      localStorage.setItem('needRefreshDashboard', 'true');
    }
    
    router.push('/dashboard');
  };

  // 继续专注
  const continueFocus = () => {
    // 重置状态
    setHighFivePhase('none');
    setHighFiveText('');
    setState('preparing');
    setShowEndOptions(false);
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
      totalPauseTime: 0,
      customDuration: plannedMinutes
    };
    sessionRef.current = newSession;
    localStorage.setItem('focusSession', JSON.stringify(newSession));
    
    // 延迟一点确保状态重置完成
    setTimeout(() => {
      router.push('/focus');
    }, 100);
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
    // 保存状态的统一函数
    const saveCurrentState = () => {
      if (state === 'running' || state === 'paused') {
        if (sessionRef.current) {
          // 如果是运行状态，使用时间戳计算最新时长
          if (state === 'running') {
            const calculatedTime = calculateElapsedTime(
              sessionRef.current.startTime,
              sessionRef.current.totalPauseTime || 0,
              false
            );
            saveState({ elapsedTime: calculatedTime });
          } else {
            saveState({ elapsedTime });
          }
        }
        // 记录保存时间戳
        localStorage.setItem('focusTimerLastSaved', new Date().toISOString());
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state === 'running' || state === 'paused') {
        // 保存最终状态
        saveCurrentState();
        // 允许关闭但先保存状态
        e.preventDefault();
        e.returnValue = '专注计时正在进行中，确定要离开吗？您的进度会被保存。';
      }
    };

    // pagehide 事件（比 beforeunload 更可靠，特别是在移动设备和电脑关机时）
    const handlePageHide = () => {
      if (state === 'running' || state === 'paused') {
        // 保存最终状态
        saveCurrentState();
        console.log('💾 页面隐藏，已保存专注状态');
      }
    };

    // 定期保存（每10秒）- 专注进行中时
    let saveInterval: NodeJS.Timeout | null = null;
    if (state === 'running') {
      saveInterval = setInterval(() => {
        if (sessionRef.current) {
          // 使用时间戳计算最新时长
          const calculatedTime = calculateElapsedTime(
            sessionRef.current.startTime,
            sessionRef.current.totalPauseTime || 0,
            false
          );
          saveState({ elapsedTime: calculatedTime });
          console.log('⏱️ 自动保存中...', { 
            elapsedTime: calculatedTime, 
            timestamp: new Date().toISOString() 
          });
        }
      }, 10000); // 每10秒保存一次
    }

    // 暂停状态也定期保存（每30秒），确保暂停时长准确
    let pauseSaveInterval: NodeJS.Timeout | null = null;
    if (state === 'paused') {
      pauseSaveInterval = setInterval(() => {
        if (sessionRef.current) {
          saveCurrentState();
          console.log('⏸️ 暂停状态自动保存...');
        }
      }, 30000); // 每30秒保存一次
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      if (saveInterval) clearInterval(saveInterval);
      if (pauseSaveInterval) clearInterval(pauseSaveInterval);
      if (highFiveTimerRef.current) clearTimeout(highFiveTimerRef.current);
      // 确保释放屏幕常亮
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch((err: any) => {
          console.warn('释放屏幕常亮失败:', err);
        });
        wakeLockRef.current = null;
      }
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
      <>
        <Head>
          <title>专注模式 | Echo</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-[#ecfdf5] via-[#e0f7ff] to-[#e1ebff] pb-20 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
          <div className="max-w-md w-full bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-2xl shadow-teal-200/50 p-8 border border-white/40 animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                准备专注
              </h1>
              <p className="text-teal-600/70 text-sm">为你的热爱投入时间</p>
            </div>
            
            {/* 计划选择 */}
            <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/80 rounded-2xl p-4 border border-emerald-100/60 mb-4 backdrop-blur-sm">
              <label className="block text-xs uppercase tracking-wider text-teal-600 font-semibold mb-2">选择计划</label>
              <select 
                value={selectedPlanId} 
                onChange={handlePlanChange} 
                className="w-full px-4 py-3 rounded-xl bg-white/90 border border-emerald-200/60 text-teal-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all"
              >
                {availablePlans.map(p => (
                  <option key={p.id} value={p.id}>{p.isPrimary ? '🌟 ' : ''}{p.name}</option>
                ))}
                <option value="free">🕊️ 自由时间</option>
              </select>
            </div>
            
            {/* 计划名称 */}
            <div className="mb-6">
              <label className="block text-xs uppercase tracking-wider text-teal-600 font-semibold mb-2">
                本次计划名称
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full rounded-xl border-2 border-emerald-200/60 bg-white/80 backdrop-blur-sm px-4 py-3 text-teal-900 placeholder:text-teal-400/50 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300/50 transition-all"
                placeholder="为这次专注起个名字..."
              />
            </div>
            
            {/* 小目标选择 */}
            <div className="mb-6">
              <label className="block text-xs uppercase tracking-wider text-teal-600 font-semibold mb-3">
                {selectedPlanId === 'free' ? '设置小目标（可选）' : '选择小目标（可选）'}
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-2 custom-scrollbar">
                {allGoals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`w-full text-left rounded-xl p-3 transition-all duration-300 transform ${
                      selectedGoal === goal.id
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-300/50 scale-[1.02]'
                        : 'bg-white/60 hover:bg-emerald-50/80 border border-emerald-100/60 text-teal-800 hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{goal.title}</span>
                      {selectedGoal === goal.id && (
                        <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* 添加自定义目标按钮 */}
              {!showAddGoal && (
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/60 p-3 flex items-center justify-center gap-2 text-teal-600 transition-all duration-300 transform hover:scale-[1.01]"
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
                <div className="flex gap-2 animate-fade-in">
                  <input
                    type="text"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="输入小目标..."
                    className="flex-1 rounded-xl border-2 border-emerald-200/60 bg-white/80 backdrop-blur-sm px-4 py-2.5 text-teal-900 placeholder:text-teal-400/50 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300/50 transition-all"
                    autoFocus
                  />
                  <button
                    onClick={handleAddGoal}
                    className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2.5 hover:shadow-lg shadow-teal-300/50 transition-all transform hover:scale-105 font-medium"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => {
                      setShowAddGoal(false);
                      setNewGoalTitle('');
                    }}
                    className="rounded-xl bg-white/80 border border-emerald-200/60 text-teal-600 px-4 py-2.5 hover:bg-emerald-50 transition-all font-medium"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-wider text-teal-600 font-semibold mb-3">
                  设置专注时长（分钟）
                </label>
                <div className="relative">
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
                    className="w-full rounded-xl border-2 border-emerald-200/60 bg-white/80 backdrop-blur-sm px-4 py-4 text-3xl text-center font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300/50 transition-all"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  {[15, 25, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        setCustomDuration(mins);
                        setPlannedMinutes(mins);
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 transform ${
                        customDuration === mins
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-300/50 scale-105'
                          : 'bg-white/60 border border-emerald-200/60 text-teal-700 hover:bg-emerald-50/80 hover:scale-102'
                      }`}
                    >
                      {mins}min
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={startFocus}
                className="w-full rounded-xl bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-500 px-4 py-4 text-white font-semibold text-lg hover:shadow-2xl shadow-teal-300/60 hover:shadow-teal-400/80 focus:outline-none focus:ring-4 focus:ring-teal-300/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>开始专注</span>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>
        <BottomNavigation active="focus" />
        
        {/* 动画样式 */}
        <style jsx>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(20, 184, 166, 0.1);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(20, 184, 166, 0.3);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(20, 184, 166, 0.5);
          }
        `}</style>
        </div>
      </>
    );
  }

  // 3秒倒计时UI
  if (state === 'starting') {
    return (
      <>
        <Head>
          <title>专注模式 | Echo</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 flex items-center justify-center relative overflow-hidden">
        {/* 动态背景装饰 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="relative inline-block">
            {countdown > 0 && (
              <>
                <div className={`text-9xl font-bold text-white mb-4 transition-all duration-300 animate-bounce scale-110`}>
                  {countdown}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-4 border-white/30 rounded-full animate-ping"></div>
                </div>
              </>
            )}
          </div>
          <p className="text-2xl text-white/90 font-medium animate-fade-in">准备就绪</p>
          <p className="text-white/70 text-sm mt-2">深呼吸，让心静下来</p>
        </div>
        </div>
      </>
    );
  }

  // 专注进行中UI - 黑匣子模式
  if (state === 'running') {
    // 实时计算已专注时长（基于时间戳，避免后台挂起时计时不准）
    const currentElapsed = sessionRef.current 
      ? calculateElapsedTime(
          sessionRef.current.startTime,
          sessionRef.current.totalPauseTime || 0,
          false
        )
      : elapsedTime;
    
    const totalSeconds = plannedMinutes * 60;
    const progress = Math.min(currentElapsed / totalSeconds, 1);

    // 金色背景：仅在本次专注达到本次设定时长时显示
    const isGolden = goldActivatedThisSessionRef.current;
    
    // 每日最小专注目标：优先使用当前计划的 dailyGoalMinutes（与本次专注时长解耦）
    const selectedPlan = selectedPlanId !== 'free'
      ? availablePlans.find(p => p.id === selectedPlanId)
      : null;
    const dailyGoalMinutes = selectedPlan?.dailyGoalMinutes ?? plannedMinutes;
    
    // 检查今日累计是否达标（用于显示"今日已达标"标识）
    const todayTotalMinutes = todayMinutesBeforeStartRef.current + Math.floor(currentElapsed / 60);
    const isDailyGoalMet = dailyGoalMinutes > 0 && todayTotalMinutes >= dailyGoalMinutes;

    return (
      <>
        <Head>
          <title>专注中 | Echo</title>
        </Head>
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300 ${
        isGolden ? 'bg-gradient-to-br from-amber-500 to-yellow-400' : 
        isDailyGoalMet ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 
        'bg-gradient-to-br from-teal-600 to-cyan-500'
      }`}>
        {/* 小目标和计划信息 */}
        {(selectedGoalInfo || sessionName) && (
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center max-w-2xl px-4">
            {selectedGoalInfo && (
              <p className={`text-lg font-medium mb-1 ${
                isGolden ? 'text-yellow-900/80' : 'text-white/80'
              }`}>
                正在专注 · {selectedGoalInfo.title}
              </p>
            )}
            {sessionName && (
              <p className={`text-sm ${
                isGolden ? 'text-yellow-900/60' : 'text-white/60'
              }`}>
                {sessionName} · 投资中
              </p>
            )}
          </div>
        )}
        
        {/* 中央计时器区域 - PC端优化 */}
        <div className="text-center max-w-md mx-auto flex flex-col items-center">
          {/* 正向计时显示（从0开始） */}
          <div className={`text-7xl sm:text-8xl md:text-9xl font-bold mb-4 transition-all duration-300 leading-tight ${
            isGolden ? 'text-yellow-50' : 'text-white'
          }`}>
            {formatTime(currentElapsed)}
          </div>
          
          {/* 目标时长和完成百分比 */}
          <div className="mb-8">
            <p className={`text-lg font-medium mb-2 ${
              isGolden ? 'text-yellow-900/90' : 'text-white/80'
            }`}>
              目标: {plannedMinutes} 分钟 · {Math.floor(progress * 100)}% 完成
            </p>
            {isGolden && (
              <div className="text-yellow-50 text-xl animate-pulse mt-2 font-semibold">
                ✨ 超额完成中 ✨
              </div>
            )}
            {isDailyGoalMet && (
              <div className={`mt-2 font-semibold flex items-center justify-center gap-2 ${
                isGolden ? 'text-yellow-50/80 text-sm' : 'text-white text-lg'
              }`}>
                <span>✓</span>
                <span>今日已达标</span>
              </div>
            )}
          </div>

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
                className={isGolden ? 'text-yellow-900/20' : 'text-white/20'}
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
                  isGolden ? 'text-yellow-50' : 'text-white'
                }`}
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setShowPauseConfirm(true)}
              disabled={pauseCount >= 1}
              className={`px-6 py-3 rounded-full font-semibold transition-all backdrop-blur-sm disabled:opacity-30 ${
                isGolden 
                  ? 'bg-yellow-900/30 text-yellow-50 hover:bg-yellow-900/40' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {pauseCount >= 1 ? '暂停已用' : '暂停'}
            </button>
            <button
              onClick={() => {
                const sessionCompleted = currentElapsed >= totalSeconds;
                const dailyCompleted = isDailyGoalMet && !isGolden;
                setPendingEndCompleted(sessionCompleted);
                setShowEndConfirm(true);
              }}
              className={`px-6 py-3 rounded-full font-semibold transition-all backdrop-blur-sm ${
                isGolden 
                  ? 'bg-yellow-900/30 text-yellow-50 hover:bg-yellow-900/40' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              结束
            </button>
          </div>
        </div>

        {/* 右下角 Lumi（专注中） */}
        {!isLumiHidden && (
          <div className="fixed bottom-8 right-8 z-30 flex flex-col items-center gap-2">
            {focusLumiMessage && (
              <div className={`max-w-[200px] px-3 py-2 rounded-xl text-sm font-medium shadow-lg animate-fade-in ${
                isGolden
                  ? 'bg-yellow-50/90 text-yellow-900 border border-yellow-200'
                  : 'bg-white/90 text-teal-800 border border-white/60'
              }`}>
                {focusLumiMessage}
              </div>
            )}
            <div onMouseEnter={onLumiHover}>
              <EchoSpirit
                state="idle"
                isCompleted={false}
                className="w-14 h-14 opacity-70 hover:opacity-100 transition-opacity"
                disableAutoInteract={true}
                autoAnimation={focusLumiAutoAnimation ?? undefined}
                onClick={handleAgitationComfortClick}
              />
            </div>
          </div>
        )}

        {/* 隐藏/显示 Lumi 按钮（专注中） */}
        <button
          onClick={() => {
            setIsLumiHidden(prev => {
              const next = !prev;
              isLumiHiddenRef.current = next;
              if (next) {
                setFocusLumiMessage(null);
              }
              return next;
            });
          }}
          className={`fixed bottom-8 z-30 transition-all text-xs font-medium rounded-full px-3 py-1.5 backdrop-blur-sm ${
            isLumiHidden
              ? 'right-8 bg-white/15 text-white/40 hover:text-white/70 hover:bg-white/25'
              : 'right-[6.5rem] bg-white/15 text-white/40 hover:text-white/70 hover:bg-white/25'
          }`}
          title={isLumiHidden ? '显示 Lumi' : '隐藏 Lumi'}
        >
          {isLumiHidden ? '🔮' : '✕'}
        </button>

        {/* 暂停确认弹窗 */}
        {showPauseConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
              <h3 className="text-xl font-bold text-gray-900 mb-3">确认暂停？</h3>
              <p className="text-gray-600 mb-6">
                您还有 <span className="font-bold text-teal-600">1 次</span> 暂停机会
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPauseConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowPauseConfirm(false);
                    pauseFocus();
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold hover:shadow-lg transition-all"
                >
                  确认暂停
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 结束确认弹窗 */}
        {showEndConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
              <h3 className="text-xl font-bold text-gray-900 mb-3">确认结束专注？</h3>
              <p className="text-gray-600 mb-6">
                已专注 <span className="font-bold text-teal-600">{Math.floor(currentElapsed / 60)}</span> 分钟
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all"
                >
                  继续专注
                </button>
                <button
                  onClick={() => {
                    setShowEndConfirm(false);
                    const sessionCompleted = currentElapsed >= totalSeconds;
                    const dailyCompleted = isDailyGoalMet && !isGolden;
                    endFocus(sessionCompleted, dailyCompleted);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:shadow-lg transition-all"
                >
                  确认结束
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </>
    );
  }

  // 暂停状态UI
  if (state === 'paused') {
    // 在暂停状态时，使用基于时间戳的方式实时计算已专注时长
    const currentElapsed = sessionRef.current 
      ? calculateElapsedTime(
          sessionRef.current.startTime,
          sessionRef.current.totalPauseTime || 0,
          true,
          sessionRef.current.pauseStart
        )
      : elapsedTime;
    
    const totalSeconds = plannedMinutes * 60;
    const progress = Math.min(currentElapsed / totalSeconds, 1);
    
    // 计算当前暂停时长
    const getPauseDuration = () => {
      if (!sessionRef.current?.pauseStart) return 0;
      const pauseStart = new Date(sessionRef.current.pauseStart).getTime();
      const now = new Date().getTime();
      return Math.floor((now - pauseStart) / 1000);
    };
    
    const pauseDuration = getPauseDuration();
    
    return (
      <>
        <Head>
          <title>暂停中 | Echo</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl font-bold text-white mb-6">
            {formatTime(currentElapsed)}
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
              onClick={() => endFocus(currentElapsed >= totalSeconds)}
              className="w-full rounded-xl bg-white/20 px-4 py-4 text-white font-semibold text-lg hover:bg-white/30 transition-all backdrop-blur-sm"
            >
              结束专注
            </button>
          </div>
        </div>

        {/* 右下角 Lumi（暂停中，等待动画） */}
        {!isLumiHidden && (
          <div className="fixed bottom-10 right-10 z-30 flex flex-col items-center gap-3">
            <div className="max-w-[200px] px-3 py-2 rounded-xl text-sm font-medium shadow-lg bg-white/15 text-blue-100 border border-white/20 backdrop-blur-sm">
              {focusLumiMessage || FOCUS_PAUSE_MESSAGE}
            </div>
            <div style={{ animation: 'lumi-breathe 3s ease-in-out infinite' }}>
              <EchoSpirit
                state="idle"
                isCompleted={false}
                className="w-16 h-16 opacity-80"
                disableAutoInteract={true}
                onClick={handleAgitationComfortClick}
              />
            </div>
          </div>
        )}

        {/* 隐藏/显示 Lumi 按钮（暂停中） */}
        <button
          onClick={() => {
            setIsLumiHidden(prev => {
              const next = !prev;
              isLumiHiddenRef.current = next;
              return next;
            });
          }}
          className={`fixed bottom-10 z-30 transition-all text-xs font-medium rounded-full px-3 py-1.5 backdrop-blur-sm ${
            isLumiHidden
              ? 'right-10 bg-white/15 text-blue-200/50 hover:text-blue-100 hover:bg-white/25'
              : 'right-[7rem] bg-white/15 text-blue-200/50 hover:text-blue-100 hover:bg-white/25'
          }`}
          title={isLumiHidden ? '显示 Lumi' : '隐藏 Lumi'}
        >
          {isLumiHidden ? '🔮' : '✕'}
        </button>

        <style jsx>{`
          @keyframes lumi-breathe {
            0%, 100% { transform: scale(1) translateY(0); opacity: 0.8; }
            50% { transform: scale(1.06) translateY(-3px); opacity: 1; }
          }
        `}</style>
        </div>
      </>
    );
  }


  // 完成状态UI
  if (state === 'completed' || state === 'interrupted') {
    const completed = state === 'completed';
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    const plannedDurationMinutes = sessionRef.current?.plannedDuration ?? plannedMinutes;
    const exceededTarget = completed && plannedDurationMinutes > 0 && elapsedTime >= plannedDurationMinutes * 60;

    return (
      <>
        <Head>
          <title>{completed ? '专注完成' : '专注中断'} | Echo</title>
        </Head>
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
        {showEndOptions && (
          <div className={`min-h-screen flex flex-col md:flex-row items-center justify-center p-6 bg-gradient-to-br transition-all duration-700 ${
            completed ? 'from-teal-500 to-cyan-600' : 'from-emerald-400 to-teal-500'
          }`}>
          <div className="text-center max-w-md w-full z-10">
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
                onClick={() => {
                  const minutes = Math.floor(elapsedTime / 60);
                  router.push(`/daily-summary?focusDuration=${minutes}`);
                }}
                className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold px-4 py-4 text-lg hover:shadow-lg shadow-teal-300/50 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {highFivePhase === 'finished' ? '写个小结？' : '写今日小结'}
              </button>
              
              <button
                onClick={goToDashboard}
                className="w-full rounded-xl bg-white px-4 py-4 text-teal-600 font-semibold text-lg hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                {highFivePhase === 'finished' ? '下次再说' : '返回主页'}
              </button>
              <button
                onClick={continueFocus}
                className="w-full rounded-xl bg-white/20 px-4 py-4 text-white font-semibold text-lg hover:bg-white/30 transition-all backdrop-blur-sm"
              >
                继续专注
              </button>
            </div>
          </div>

          {/* 小精灵击掌区域 - 仅在完成后显示 */}
          {completed && highFivePhase !== 'none' && (
            <div className="mt-12 md:mt-0 md:ml-12 relative flex flex-col items-center animate-fade-in">
              {/* 对话气泡 */}
              {highFiveText && (
                <div className="absolute -top-16 bg-white rounded-2xl px-4 py-2 shadow-xl animate-bounce-subtle text-teal-800 font-bold whitespace-nowrap after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-white">
                  {highFiveText}
                </div>
              )}
              
              <EchoSpirit 
                state={highFivePhase === 'ready' ? 'highfive' : highFivePhase === 'success' ? 'highfive-success' : 'idle'}
                isCompleted={true}
                className="w-32 h-32 md:w-40 md:h-40 cursor-pointer hover:scale-105 transition-transform"
                disableAutoInteract={true}
                onClick={handleHighFiveClick}
              />
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
      
      {/* 显示完成信息 */}
      {!showEndOptions && (
        <div className={`min-h-screen flex items-center justify-center p-6 bg-gradient-to-br ${
          completed ? 'from-teal-500 to-cyan-600' : 'from-emerald-400 to-teal-500'
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
                ? exceededTarget && plannedDurationMinutes
                  ? `你超额完成了目标 ${plannedDurationMinutes} 分钟 · 实际 ${minutes} 分 ${seconds} 秒`
                  : `你本次专注共持续了 ${minutes} 分 ${seconds} 秒`
                : `你已专注 ${minutes} 分 ${seconds} 秒`}
            </p>
            <div className="text-white/70">
              {completed 
                ? exceededTarget
                  ? '超额完成，保持这股势头！'
                  : '这证明你的热爱，比你的计划更加澎湃。'
                : '意识到自己状态的变化，也是一种专注。'}
            </div>
          </div>
        </div>
      )}
      </>
    );
  }


  // 意外中断提示弹窗
  if (showInterruptedAlert && interruptedSessionData) {
    return (
      <>
        <Head>
          <title>专注模式 | Echo</title>
        </Head>
        <InterruptedSessionAlert
          minutes={interruptedSessionData.minutes}
          timestamp={interruptedSessionData.timestamp}
          onConfirm={() => {
            setShowInterruptedAlert(false);
            setInterruptedSessionData(null);
            // 延迟一下确保状态清理完成
            setTimeout(() => {
              router.push('/dashboard');
            }, 100);
          }}
        />
      </>
    );
  }


  return null;
}
