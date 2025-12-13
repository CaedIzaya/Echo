/**
 * 深度觉察引擎 - 类型定义
 * 用于检测用户负面情绪和脆弱状态，优先级高于普通对话池
 */

export type Responder = 'LUMI' | 'HEART_TREE';
export type TriggerMode = 'PASSIVE' | 'LAUNCH' | 'HEART_TREE_FLOATING';

export type EventType =
  | 'APP_FOREGROUND_START'
  | 'APP_FOREGROUND_END'
  | 'APP_LAUNCH'
  | 'FOCUS_TIMER_OPEN'
  | 'FOCUS_TIMER_START'
  | 'FOCUS_TIMER_END'
  | 'FOCUS_TIMER_CANCEL'
  | 'LUMI_CLICK'
  | 'HEART_TREE_OPEN';

export interface Event {
  userId: string;
  type: EventType;
  ts: number;      // 时间戳（毫秒）
  meta?: {
    durationMinutes?: number;
    sessionId?: string;
    focusGoalMinutes?: number;
    [key: string]: any;
  };
}

export interface DayStats {
  date: string;                 // yyyy-MM-dd（本地时区）
  appForegroundMinutes: number; // 当日前台总时长
  homeStayMinutes: number;      // 停在主页的时长（用于"徘徊"检测）
  focusTotalMinutes: number;    // 当日专注总时长
  focusGoalMinutes?: number;    // 当天最小目标（min-goal）
  focusSessionCount: number;    // 专注会话总数
  focusShortSessionCount: number;        // < 3min 或中断的会话数
  focusTimerOpenCountNoStart: number;    // 打开计时器但未开始的次数
  lumiClickCount: number;        // Lumi 点击次数
}

export interface UserState {
  userId: string;
  currentStreak: number;        // 当前连续天数
  streakStableDays: number;     // streak=1 持续了几天
  lastActiveDate: string;       // yyyy-MM-dd
  timezone: string;             // e.g. 'Asia/Shanghai'
  hasNamedHeartTree: boolean;   // 是否已给心树命名
  heartTreeName?: string;       // 心树名字
}

export interface ToneProfile {
  forbidGoalMention?: boolean;        // 禁止提"目标"
  forbidRestartCall?: boolean;         // 禁止说"再开始吧"
  forbidEncouragePush?: boolean;       // 禁止说"继续加油"
  emphasizeEffort?: boolean;           // 强调"你已经在努力"
  emphasizeSeenAndUnderstood?: boolean; // 强调"被看见"
  emphasizeReturnIsEnough?: boolean;   // 强调"回来就很好"
  suggestRestNotEfficiency?: boolean;   // 建议休息而非效率
  avoidRewardDependency?: boolean;     // 避免奖励依赖行为
  avoidInterrogation?: boolean;        // 避免拷问式提问
}

export interface AwarenessContext {
  userState: UserState;
  today: DayStats;
  lastNDays: DayStats[];   // 最近 N 天，包含 today
  nowTs: number;
  nowLocalHour: number;    // 本地时间小时（0-23）
  recentEvents: Event[];   // 最近 30~60 分钟内的事件
}

export interface AwarenessMatch {
  ruleId: string;            // 规则 ID，如 'SCENE1_IDLE_HESITATE'
  riskLevel: 1 | 2 | 3;      // 危险等级，3 最高
  responder: Responder;      // 由谁回应：Lumi 或 心树
  emotionTag: string;        // 情绪标签，用于路由到对应文案池
  tone: ToneProfile;         // 文案语气约束
  triggerMode: TriggerMode;  // 触发方式
}

export interface AwarenessRule {
  id: string;
  priority: number;             // 优先级，数值越大越高
  cooldownMinutes: number;      // 冷却时间（分钟）
  detect(ctx: AwarenessContext): AwarenessMatch | null;
}

export interface AwarenessResponse {
  match: AwarenessMatch;
  copy: string;                 // 选中的文案
  heartTreeName?: string;       // 心树名字（如果由心树回应）
}




