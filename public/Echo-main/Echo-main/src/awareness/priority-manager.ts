/**
 * 深度觉察引擎 - 优先级管理器
 * 确保觉察引擎的文案优先级最高，凌驾于所有其他文案系统之上
 */

import { AwarenessContext, AwarenessResponse } from './types';
import { handleAwarenessEvent } from './dispatcher';

/**
 * 优先级级别定义
 * 数值越大，优先级越高
 */
export enum PriorityLevel {
  NORMAL = 0,                    // 普通文案系统
  AUTO_DIALOGUE = 100,           // 自动对话（挂机自动说话）
  DAILY_WELCOME = 500,           // 每日欢迎对话
  AWARENESS_LOW = 800,           // 觉察引擎（低优先级：挂机太久等）
  AWARENESS_MEDIUM = 900,        // 觉察引擎（中优先级：多次短专注等）
  AWARENESS_HIGH = 1000,         // 觉察引擎（高优先级：3天未上线等）
}

/**
 * 文案响应结果
 */
export interface DialogueResponse {
  priority: PriorityLevel;
  source: 'AWARENESS' | 'NORMAL' | 'LUMI' | 'HEART_TREE';
  copy: string;
  metadata?: {
    ruleId?: string;
    heartTreeName?: string;
    triggerMode?: string;
    [key: string]: any;
  };
}

/**
 * 全局标志：是否启用觉察引擎
 */
let awarenessEnabled = true;

/**
 * 启用/禁用觉察引擎
 */
export function setAwarenessEnabled(enabled: boolean): void {
  awarenessEnabled = enabled;
}

/**
 * 检查是否启用觉察引擎
 */
export function isAwarenessEnabled(): boolean {
  return awarenessEnabled;
}

/**
 * 统一的文案获取入口
 * 优先检查觉察引擎，如果匹配则返回觉察文案，否则返回 null（由其他系统处理）
 * 
 * @param ctx 觉察上下文
 * @param currentDialoguePriority 当前文案系统的优先级（用于比较）
 * @returns 如果觉察引擎匹配且优先级更高，返回觉察响应；否则返回 null
 */
export function getDialogueWithPriority(
  ctx: AwarenessContext,
  currentDialoguePriority: PriorityLevel = PriorityLevel.NORMAL
): DialogueResponse | null {
  // 如果觉察引擎未启用，直接返回 null
  if (!awarenessEnabled) {
    return null;
  }

  // 优先检查觉察引擎
  const awarenessResponse = handleAwarenessEvent(ctx);
  
  if (awarenessResponse) {
    // 根据规则ID动态确定优先级
    const awarenessPriority = getAwarenessPriorityByRule(awarenessResponse.match.ruleId, ctx);
    
    // 只有当觉察优先级高于当前对话优先级时，才返回觉察文案
    if (awarenessPriority > currentDialoguePriority) {
      return {
        priority: awarenessPriority,
        source: awarenessResponse.match.responder === 'LUMI' ? 'LUMI' : 'HEART_TREE',
        copy: awarenessResponse.copy,
        metadata: {
          ruleId: awarenessResponse.match.ruleId,
          heartTreeName: awarenessResponse.heartTreeName,
          triggerMode: awarenessResponse.match.triggerMode,
          riskLevel: awarenessResponse.match.riskLevel,
          emotionTag: awarenessResponse.match.emotionTag,
        },
      };
    }
  }

  // 觉察引擎未匹配或优先级不够高，返回 null，由其他文案系统处理
  return null;
}

/**
 * 根据规则ID和上下文动态确定觉察优先级
 */
function getAwarenessPriorityByRule(ruleId: string, ctx: AwarenessContext): PriorityLevel {
  switch (ruleId) {
    case 'SCENE2_STREAK_STAY_1': {
      // 场景2：连续几天未上线
      // 如果超过3天未上线，使用高优先级（可抢占每日欢迎）
      // 如果只是短时间未上线（<1天），使用低优先级（不能抢占每日欢迎）
      const lastActive = new Date(ctx.userState.lastActiveDate);
      const now = new Date(ctx.nowTs);
      const daysGap = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysGap >= 3) {
        return PriorityLevel.AWARENESS_HIGH; // 3天以上，高优先级
      } else {
        return PriorityLevel.AWARENESS_LOW; // 3天以内，低优先级
      }
    }
    
    case 'SCENE1_IDLE_HESITATE':
      // 场景1：挂机太久但迟迟不专注 - 低优先级，不能抢占每日欢迎
      return PriorityLevel.AWARENESS_LOW;
    
    case 'SCENE4_MULTI_SHORT_SESSIONS':
    case 'SCENE5_LATE_NIGHT_ONLINE':
      // 场景4、5：多次短专注、深夜上线 - 中优先级
      return PriorityLevel.AWARENESS_MEDIUM;
    
    case 'SCENE3_MIN_GOAL_FAIL_DAYS':
    case 'SCENE6_LUMI_CLICK_MANY':
      // 场景3、6：连续未完成目标、频繁点击Lumi - 低优先级
      return PriorityLevel.AWARENESS_LOW;
    
    default:
      // 默认中优先级
      return PriorityLevel.AWARENESS_MEDIUM;
  }
}

/**
 * 检查是否应该阻止其他文案系统触发
 * 
 * @param ctx 觉察上下文
 * @returns 如果觉察引擎匹配，返回 true（阻止其他系统）；否则返回 false
 */
export function shouldBlockOtherDialogues(ctx: AwarenessContext): boolean {
  const response = getDialogueWithPriority(ctx);
  return response !== null && response.priority >= PriorityLevel.AWARENESS_LOW;
}

/**
 * 获取当前应该显示的文案（统一入口）
 * 这个方法应该在所有文案系统之前调用
 * 
 * @param ctx 觉察上下文
 * @param fallbackDialogueGetter 其他文案系统的获取函数（如果觉察引擎未匹配时调用）
 * @returns 最终应该显示的文案响应
 */
export function getFinalDialogue(
  ctx: AwarenessContext,
  fallbackDialogueGetter?: () => DialogueResponse | null
): DialogueResponse | null {
  // 1. 优先检查觉察引擎
  const awarenessDialogue = getDialogueWithPriority(ctx);
  if (awarenessDialogue) {
    return awarenessDialogue;
  }

  // 2. 如果觉察引擎未匹配，使用其他文案系统
  if (fallbackDialogueGetter) {
    return fallbackDialogueGetter();
  }

  return null;
}




