/**
 * 心树命名流程管理
 * 处理新用户首次进入心树时的命名流程
 */

import { UserState } from './types';

export interface HeartTreeNamingState {
  isNaming: boolean;
  inputName: string;
  hasCompleted: boolean;
}

/**
 * 检查用户是否需要进入命名流程
 */
export function shouldShowNamingFlow(userState: UserState): boolean {
  return !userState.hasNamedHeartTree;
}

/**
 * 完成命名流程
 */
export function completeNaming(
  userState: UserState,
  heartTreeName: string
): UserState {
  if (!heartTreeName || heartTreeName.trim().length === 0) {
    throw new Error('心树名字不能为空');
  }

  return {
    ...userState,
    hasNamedHeartTree: true,
    heartTreeName: heartTreeName.trim(),
  };
}

/**
 * 获取命名引导文案
 */
export function getNamingGuideText(): string {
  return '为 ta 起个名字吧，从今以后，ta 就是你的心树了。';
}

/**
 * 获取新用户首次见面文案（命名完成后显示）
 */
export function getFirstMeetingText(heartTreeName: string): string {
  // 这里可以返回一条欢迎文案，或者从专门的欢迎文案池中选择
  return `你好，我是 ${heartTreeName}。很高兴遇见你。`;
}


