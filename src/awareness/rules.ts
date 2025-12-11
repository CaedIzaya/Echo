/**
 * 深度觉察引擎 - 6 大场景规则定义
 */

import {
  AwarenessContext,
  AwarenessMatch,
  AwarenessRule,
} from './types';
import { diffInDays, isWithinMinutes, getShortFocusSessions } from './utils';

/**
 * 🜂 场景 1：一天内挂机太久，却迟迟无法进入专注
 * 触发时机：
 * - app 前台停留 > X 分钟
 * - 专注计时器多次打开却未开始
 * - 用户像"徘徊一样"反复停在主页
 * 谁来说：心树（更安静，不会给用户压力）
 * 呈现方式：轻浮窗（顶部缓慢滑出，3 秒渐隐）
 */
const R1_IDLE_HESITATE: AwarenessRule = {
  id: 'SCENE1_IDLE_HESITATE',
  priority: 5,
  cooldownMinutes: 60,
  detect(ctx: AwarenessContext): AwarenessMatch | null {
    const t = ctx.today;
    
    // 条件1：前台停留时间长，且大部分时间在主页
    const longStay = t.appForegroundMinutes >= 20;
    const mostlyHome = t.homeStayMinutes / Math.max(t.appForegroundMinutes, 1) >= 0.6;
    
    // 条件2：几乎没有专注
    const noFocus = t.focusTotalMinutes < 5;
    
    // 条件3：多次打开计时器但未开始
    const multiTimerOpenNoStart = t.focusTimerOpenCountNoStart >= 2;
    
    if (!(longStay && mostlyHome && (noFocus || multiTimerOpenNoStart))) {
      return null;
    }

    return {
      ruleId: this.id,
      riskLevel: 2,
      responder: 'HEART_TREE',
      triggerMode: 'HEART_TREE_FLOATING',
      emotionTag: '徘徊门口_想开始但很重',
      tone: {
        emphasizeSeenAndUnderstood: true,
        forbidEncouragePush: true,
      },
    };
  },
};

/**
 * 🜁 场景 2：连续几天未上线（Streak 固定为 1）
 * 触发时机：
 * - timestamp 差 > 3 天
 * - streak = 1 持续 3 天以上
 * 谁来说：Lumi
 * 呈现方式：Lumi 主动说一句（上线瞬间）
 */
const R2_STREAK_STAY_1: AwarenessRule = {
  id: 'SCENE2_STREAK_STAY_1',
  priority: 10,
  cooldownMinutes: 720, // 12 小时，一天最多一次
  detect(ctx: AwarenessContext): AwarenessMatch | null {
    const { userState, nowTs } = ctx;
    
    // 计算距离上次活跃的天数
    const lastActive = new Date(userState.lastActiveDate);
    const now = new Date(nowTs);
    const daysGap = diffInDays(lastActive, now);
    
    if (daysGap <= 3) return null;
    
    // streak 必须是 1，且持续了至少 3 天
    if (userState.currentStreak !== 1 || userState.streakStableDays < 3) {
      return null;
    }

    return {
      ruleId: this.id,
      riskLevel: 3,
      responder: 'LUMI',
      triggerMode: 'LAUNCH',
      emotionTag: '长时间未上线_回归即被肯定',
      tone: {
        emphasizeReturnIsEnough: true,
        avoidInterrogation: true,
        forbidRestartCall: true,
        forbidEncouragePush: true,
      },
    };
  },
};

/**
 * 🜂 场景 3：连续几天未完成最小专注目标
 * 触发时机：
 * - min-goal 连续未达成 ≥ 3 天
 * - 每日专注 < 目标值 30%
 * 谁来说：心树（需要更中性的陪伴）
 * 呈现方式：BottomNavigation 里面心树图标发亮，然后去的时候心树会说话
 */
const R3_MIN_GOAL_FAIL_DAYS: AwarenessRule = {
  id: 'SCENE3_MIN_GOAL_FAIL_DAYS',
  priority: 9,
  cooldownMinutes: 720,
  detect(ctx: AwarenessContext): AwarenessMatch | null {
    const days = ctx.lastNDays.slice(-5); // 检查最近 5 天
    let failDays = 0;
    
    for (const d of days) {
      if (!d.focusGoalMinutes || d.focusGoalMinutes <= 0) continue;
      
      const ratio = d.focusTotalMinutes / d.focusGoalMinutes;
      if (ratio < 0.3) { // 专注时长 < 目标的 30%
        failDays++;
      }
    }
    
    if (failDays < 3) return null;

    return {
      ruleId: this.id,
      riskLevel: 3,
      responder: 'HEART_TREE',
      triggerMode: 'HEART_TREE_FLOATING',
      emotionTag: '微自我否定_连续未达成',
      tone: {
        forbidGoalMention: true,
        emphasizeSeenAndUnderstood: true,
        forbidEncouragePush: true,
      },
    };
  },
};

/**
 * 🜃 场景 4：多次尝试专注，却每次都失败
 * 触发时机：
 * - 30 分钟内启动 2~4 次专注
 * - 每次 < 3 分钟中断
 * 谁来说：Lumi
 * 呈现方式：Lumi 说话
 */
const R4_MULTI_SHORT_SESSIONS: AwarenessRule = {
  id: 'SCENE4_MULTI_SHORT_SESSIONS',
  priority: 8,
  cooldownMinutes: 60,
  detect(ctx: AwarenessContext): AwarenessMatch | null {
    // 获取最近 30 分钟内、时长 < 3 分钟的短会话
    const shortSessions = getShortFocusSessions(ctx.recentEvents, 30, 3);
    const count = shortSessions.length;
    
    // 必须是 2-4 次尝试
    if (count < 2 || count > 4) return null;

    return {
      ruleId: this.id,
      riskLevel: 3,
      responder: 'LUMI',
      triggerMode: 'PASSIVE',
      emotionTag: '焦虑努力_多次短专注',
      tone: {
        emphasizeEffort: true,
        emphasizeSeenAndUnderstood: true,
        forbidEncouragePush: true,
      },
    };
  },
};

/**
 * 🜄 场景 5：深夜上线（23:00–4:00）
 * 触发时机：
 * - localTime(中国大陆)/userTime 在 23~04
 * - 或深夜反复启动 app
 * 谁来说：Lumi
 * 呈现方式：Lumi 说话
 */
const R5_LATE_NIGHT_ONLINE: AwarenessRule = {
  id: 'SCENE5_LATE_NIGHT_ONLINE',
  priority: 9,
  cooldownMinutes: 180, // 3 小时
  detect(ctx: AwarenessContext): AwarenessMatch | null {
    const h = ctx.nowLocalHour;
    const isLateNight = h >= 23 || h < 4;
    
    if (!isLateNight) return null;
    
    // 检查最近 10 分钟内是否有 APP_LAUNCH 事件
    const launchCount = ctx.recentEvents.filter(
      e => e.type === 'APP_LAUNCH' && isWithinMinutes(e.ts, ctx.nowTs, 10)
    ).length;
    
    if (launchCount < 1) return null;

    return {
      ruleId: this.id,
      riskLevel: 3,
      responder: 'LUMI',
      triggerMode: 'LAUNCH',
      emotionTag: '深夜情绪过载_失眠焦虑',
      tone: {
        suggestRestNotEfficiency: true,
        forbidEncouragePush: true,
        forbidGoalMention: true,
        avoidInterrogation: true,
      },
    };
  },
};

/**
 * 🜅 场景 6：点击 Lumi 太多次（不安 / 寻求陪伴）
 * 触发时机：
 * - 10 分钟内连续点击 Lumi ≥ 10 次
 * - 或用户在无专注状态下不断戳 Lumi
 * 谁来说：必须由 Lumi 自己说
 * 呈现方式：Lumi 说话
 */
const R6_LUMI_CLICK_MANY: AwarenessRule = {
  id: 'SCENE6_LUMI_CLICK_MANY',
  priority: 7,
  // 为了让用户在 10 分钟内可以偶尔收到多条关怀，将冷却时间缩短为 1 分钟
  cooldownMinutes: 1,
  detect(ctx: AwarenessContext): AwarenessMatch | null {
    // 统计最近 10 分钟内的 LUMI_CLICK 事件
    const clicks10m = ctx.recentEvents.filter(
      e => e.type === 'LUMI_CLICK' && isWithinMinutes(e.ts, ctx.nowTs, 10)
    ).length;
    
    // 为了避免随手点两三下就触发，将阈值提高到 10 次：
    // 只有在短时间内「连续多次戳 Lumi」时，才判断为显著的寻求陪伴 / 不安信号
    if (clicks10m < 10) return null;

    return {
      ruleId: this.id,
      riskLevel: 2,
      responder: 'LUMI',
      triggerMode: 'PASSIVE',
      emotionTag: '不安_寻找情绪锚点',
      tone: {
        emphasizeSeenAndUnderstood: true,
        avoidRewardDependency: true,
      },
    };
  },
};

/**
 * 导出所有规则
 */
export const rules: AwarenessRule[] = [
  R1_IDLE_HESITATE,
  R2_STREAK_STAY_1,
  R3_MIN_GOAL_FAIL_DAYS,
  R4_MULTI_SHORT_SESSIONS,
  R5_LATE_NIGHT_ONLINE,
  R6_LUMI_CLICK_MANY,
];

