/**
 * 深度觉察引擎 - 存储管理（冷却机制）
 * 实际项目中可以替换为数据库或持久化存储
 */

// 规则优先级配置
const rulePriority: Record<string, number> = {
  SCENE1_IDLE_HESITATE: 5,
  SCENE2_STREAK_STAY_1: 10,
  SCENE3_MIN_GOAL_FAIL_DAYS: 9,
  SCENE4_MULTI_SHORT_SESSIONS: 8,
  SCENE5_LATE_NIGHT_ONLINE: 9,
  SCENE6_LUMI_CLICK_MANY: 7,
};

// 冷却时间映射（内存存储，实际应使用持久化存储）
const cooldownMap = new Map<string, number>(); // key = `${userId}:${ruleId}` => 冷却到期时间戳

/**
 * 获取规则的优先级
 */
export function getRulePriority(ruleId: string): number {
  return rulePriority[ruleId] ?? 0;
}

/**
 * 检查规则是否在冷却期内
 */
export function isInCooldown(userId: string, ruleId: string): boolean {
  const key = `${userId}:${ruleId}`;
  const until = cooldownMap.get(key);
  if (!until) return false;
  
  const now = Date.now();
  if (now >= until) {
    // 冷却期已过，清除记录
    cooldownMap.delete(key);
    return false;
  }
  
  return true;
}

/**
 * 标记规则进入冷却期
 */
export function markCooldown(
  userId: string,
  ruleId: string,
  cooldownMinutes?: number
): void {
  const key = `${userId}:${ruleId}`;
  // 从规则配置中获取冷却时间，或使用传入的参数
  // 如果未传入，使用默认值 60 分钟
  const ttlMin = cooldownMinutes ?? 60;
  
  cooldownMap.set(key, Date.now() + ttlMin * 60 * 1000);
}

/**
 * 清除指定用户的所有冷却记录（用于测试或重置）
 */
export function clearCooldown(userId: string): void {
  const keysToDelete: string[] = [];
  cooldownMap.forEach((_, key) => {
    if (key.startsWith(`${userId}:`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => cooldownMap.delete(key));
}

/**
 * 获取冷却状态信息（用于调试）
 */
export function getCooldownStatus(userId: string): Record<string, number> {
  const status: Record<string, number> = {};
  const now = Date.now();
  
  cooldownMap.forEach((until, key) => {
    if (key.startsWith(`${userId}:`)) {
      const remaining = Math.max(0, until - now);
      status[key] = remaining;
    }
  });
  
  return status;
}


