/**
 * 深度觉察引擎 - 事件调度器
 * 负责在关键事件发生时触发觉察检测，并处理响应
 */

import { AwarenessContext, AwarenessResponse } from './types';
import { runAwarenessEngine } from './engine';
import { selectCopy } from './copy-pool';

/**
 * 处理事件并触发觉察检测
 * 
 * @param ctx 觉察上下文
 * @returns 觉察响应结果，如果没有匹配则返回 null
 */
export function handleAwarenessEvent(ctx: AwarenessContext): AwarenessResponse | null {
  // 运行觉察引擎
  const match = runAwarenessEngine(ctx);
  if (!match) {
    return null;
  }

  // 从文案池中选择一条文案
  const copy = selectCopy(match.ruleId, match.responder);
  if (!copy) {
    console.warn(`No copy found for rule: ${match.ruleId}, responder: ${match.responder}`);
    return null;
  }

  // 构建响应对象
  const response: AwarenessResponse = {
    match,
    copy,
    heartTreeName: match.responder === 'HEART_TREE' ? ctx.userState.heartTreeName : undefined,
  };

  return response;
}

/**
 * 觉察响应回调函数类型
 * 用于将觉察结果传递给 UI 层进行渲染
 */
export type AwarenessResponseHandler = (response: AwarenessResponse) => void;

/**
 * 全局响应处理器（由 UI 层注册）
 */
let globalResponseHandler: AwarenessResponseHandler | null = null;

/**
 * 注册全局响应处理器
 */
export function registerResponseHandler(handler: AwarenessResponseHandler): void {
  globalResponseHandler = handler;
}

/**
 * 触发觉察检测并自动调用注册的处理器
 */
export function triggerAwareness(ctx: AwarenessContext): void {
  const response = handleAwarenessEvent(ctx);
  if (response && globalResponseHandler) {
    globalResponseHandler(response);
  }
}




















