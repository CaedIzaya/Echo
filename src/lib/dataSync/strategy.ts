/**
 * 数据同步策略
 * 
 * 核心原则：
 * 1. 用户的努力永远不丢失（宁可多给，不可少给）
 * 2. 数据库是权威源（但不是唯一源）
 * 3. localStorage 是快速缓存和离线备份
 * 
 * 策略：防御性最大值合并
 * - 适用于：只会增加的数据（经验、时长、成就）
 * - 不适用于：会减少的数据（需要其他策略）
 */

export interface SyncMetadata {
  value: number | string;
  updatedAt: string;   // 数据更新时间
  syncedAt?: string;   // 最后同步时间
}

/**
 * 合并数据策略
 * 
 * @param dbValue 数据库中的值
 * @param localValue localStorage 中的值
 * @param strategy 合并策略
 * @returns 最终使用的值和是否需要同步
 */
export function mergeData(
  dbValue: number,
  localValue: number,
  strategy: 'max' | 'database-first' | 'local-first' = 'max'
): { finalValue: number; needSyncToDB: boolean; conflict: boolean } {
  
  if (strategy === 'max') {
    // 防御性策略：取较大值
    const finalValue = Math.max(dbValue, localValue);
    const conflict = localValue !== dbValue && localValue > 0 && dbValue > 0;
    
    return {
      finalValue,
      needSyncToDB: localValue > dbValue,  // 本地更大需要同步
      conflict,
    };
  }
  
  if (strategy === 'database-first') {
    // 严格策略：始终使用数据库
    return {
      finalValue: dbValue,
      needSyncToDB: false,
      conflict: false,
    };
  }
  
  if (strategy === 'local-first') {
    // 本地优先：只在本地为空时用数据库
    return {
      finalValue: localValue || dbValue,
      needSyncToDB: localValue > dbValue,
      conflict: false,
    };
  }
  
  return { finalValue: dbValue, needSyncToDB: false, conflict: false };
}

/**
 * 检查数据冲突
 * 
 * 当 localStorage 和数据库都有数据且不相等时，可能存在冲突
 */
export function detectConflict(
  dbValue: number,
  localValue: number,
  threshold: number = 10  // 差异阈值
): { hasConflict: boolean; severity: 'low' | 'medium' | 'high' } {
  if (dbValue === localValue) {
    return { hasConflict: false, severity: 'low' };
  }
  
  if (localValue === 0 || dbValue === 0) {
    // 一方为空，不算冲突
    return { hasConflict: false, severity: 'low' };
  }
  
  const diff = Math.abs(dbValue - localValue);
  const percentDiff = diff / Math.max(dbValue, localValue) * 100;
  
  if (percentDiff < 5) {
    // 差异 < 5%：低风险
    return { hasConflict: true, severity: 'low' };
  } else if (percentDiff < 20) {
    // 差异 5-20%：中风险
    return { hasConflict: true, severity: 'medium' };
  } else {
    // 差异 > 20%：高风险（可能是数据错误）
    return { hasConflict: true, severity: 'high' };
  }
}

/**
 * 日志冲突
 * 
 * 将数据冲突记录到控制台和可选的日志系统
 */
export function logConflict(
  dataType: string,
  dbValue: number,
  localValue: number,
  resolution: 'used-max' | 'used-db' | 'used-local'
) {
  const conflict = detectConflict(dbValue, localValue);
  
  if (!conflict.hasConflict) return;
  
  const emoji = {
    low: '⚠️',
    medium: '⚠️⚠️',
    high: '🚨',
  }[conflict.severity];
  
  console.warn(`${emoji} [数据冲突] ${dataType}`, {
    数据库值: dbValue,
    本地值: localValue,
    差异: Math.abs(dbValue - localValue),
    差异百分比: ((Math.abs(dbValue - localValue) / Math.max(dbValue, localValue)) * 100).toFixed(1) + '%',
    严重程度: conflict.severity,
    解决方式: resolution,
    采用值: Math.max(dbValue, localValue),
  });
  
  // TODO: 可选 - 发送到日志服务器
  // if (conflict.severity === 'high') {
  //   sendToLogService({ type: 'data-conflict', ... });
  // }
}

