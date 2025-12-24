/**
 * 深度觉察引擎 - 主入口
 * 导出所有公共 API
 */

export * from './types';
export * from './engine';
export * from './dispatcher';
export * from './rules';
export * from './store';
export * from './copy-pool';
export * from './utils';
export * from './priority-manager';
export * from './database-adapter';
export * from './integration-guide';

// 便捷导出
export { runAwarenessEngine } from './engine';
export { handleAwarenessEvent, triggerAwareness, registerResponseHandler } from './dispatcher';
export { rules } from './rules';
export { COPY_POOL, selectCopy, getCopyPool } from './copy-pool';
export { getDialogueWithPriority, shouldBlockOtherDialogues, getFinalDialogue, PriorityLevel } from './priority-manager';
export { buildAwarenessContext, adaptUserState, adaptDayStats, adaptEvent } from './database-adapter';




















