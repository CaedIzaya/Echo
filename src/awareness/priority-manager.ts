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
  NORMAL = 0,           // 普通文案系统
  AWARENESS = 1000,     // 觉察引擎（最高优先级）
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
 * @returns 如果觉察引擎匹配，返回高优先级响应；否则返回 null
 */
export function getDialogueWithPriority(
  ctx: AwarenessContext
): DialogueResponse | null {
  // 如果觉察引擎未启用，直接返回 null
  if (!awarenessEnabled) {
    return null;
  }

  // 优先检查觉察引擎
  const awarenessResponse = handleAwarenessEvent(ctx);
  
  if (awarenessResponse) {
    // 觉察引擎匹配，返回最高优先级响应
    return {
      priority: PriorityLevel.AWARENESS,
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

  // 觉察引擎未匹配，返回 null，由其他文案系统处理
  return null;
}

/**
 * 检查是否应该阻止其他文案系统触发
 * 
 * @param ctx 觉察上下文
 * @returns 如果觉察引擎匹配，返回 true（阻止其他系统）；否则返回 false
 */
export function shouldBlockOtherDialogues(ctx: AwarenessContext): boolean {
  const response = getDialogueWithPriority(ctx);
  return response !== null && response.priority === PriorityLevel.AWARENESS;
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

