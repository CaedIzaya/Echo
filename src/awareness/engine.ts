/**
 * 深度觉察引擎 - 核心引擎
 * 负责运行所有规则并返回匹配结果
 */

import { AwarenessContext, AwarenessMatch, AwarenessRule } from './types';
import { rules } from './rules';
import { isInCooldown, getRulePriority, markCooldown } from './store';

/**
 * 运行觉察引擎，检测用户当前是否存在负面情绪或脆弱状态
 * 
 * @param ctx 觉察上下文（包含用户状态、统计数据、事件等）
 * @returns 匹配的觉察结果，如果没有匹配则返回 null
 */
export function runAwarenessEngine(ctx: AwarenessContext): AwarenessMatch | null {
  // 遍历所有规则，检测是否匹配
  const matches = rules
    .map(rule => rule.detect(ctx))
    .filter((match): match is AwarenessMatch => match !== null)
    .filter(match => !isInCooldown(ctx.userState.userId, match.ruleId));

  // 如果没有匹配，返回 null
  if (matches.length === 0) {
    return null;
  }

  // 按优先级排序：先按 riskLevel（3 > 2 > 1），再按 priority
  matches.sort((a, b) => {
    const riskDiff = b.riskLevel - a.riskLevel;
    if (riskDiff !== 0) return riskDiff;
    
    const priorityA = getRulePriority(a.ruleId);
    const priorityB = getRulePriority(b.ruleId);
    return priorityB - priorityA;
  });

  // 返回优先级最高的匹配结果
  const match = matches[0];
  
  // 找到对应的规则以获取冷却时间
  const rule = rules.find((r: AwarenessRule) => r.id === match.ruleId);
  const cooldownMinutes = rule?.cooldownMinutes ?? 60;
  
  // 标记该规则进入冷却期
  markCooldown(ctx.userState.userId, match.ruleId, cooldownMinutes);
  
  return match;
}






