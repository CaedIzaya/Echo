/**
 * 数据优先级管理
 * 确保数据库数据优先，按优先级划分数据来源
 */

import { userStorageJSON } from './userStorage';

/**
 * 数据优先级
 * DATABASE > LOCAL_STORAGE > DEFAULT
 */
export enum DataPriority {
  DATABASE = 'database',      // 最高优先级：数据库
  LOCAL_STORAGE = 'localStorage', // 中等优先级：本地存储
  DEFAULT = 'default'         // 最低优先级：默认值
}

/**
 * 数据类型配置
 * 定义哪些数据优先从数据库读取
 */
export const DATA_TYPE_CONFIG = {
  // 高优先级数据：必须从数据库读取
  HIGH_PRIORITY: [
    'userExp',          // 用户经验值
    'userLevel',        // 用户等级
    'heartTreeExp',     // 心树经验值
    'heartTreeLevel',   // 心树等级
    'heartTreeName',    // 心树名称
    'streakDays',       // 连续天数
    'totalFocusMinutes', // 总专注分钟数
    'achievements',     // 成就系统
    'userProfile',      // 用户档案
    'userPlans',        // 用户计划（数据库管理）
  ],
  
  // 中优先级数据：优先数据库，fallback到localStorage
  MEDIUM_PRIORITY: [
    'todayStats',       // 今日统计
    'weeklyStats',      // 本周统计
    'monthlyStats',     // 本月统计
    'focusSessions',    // 专注记录
  ],
  
  // 低优先级数据：可以只用localStorage
  LOW_PRIORITY: [
    'userPreferences',  // 用户偏好设置
    'uiState',          // UI状态
    'notifications',    // 通知设置
    'theme',            // 主题设置
  ]
};

/**
 * 检查数据类型的优先级
 */
export function getDataPriority(key: string): DataPriority {
  if (DATA_TYPE_CONFIG.HIGH_PRIORITY.includes(key)) {
    return DataPriority.DATABASE;
  }
  if (DATA_TYPE_CONFIG.MEDIUM_PRIORITY.includes(key)) {
    return DataPriority.DATABASE; // 优先数据库
  }
  return DataPriority.LOCAL_STORAGE; // 默认localStorage
}

/**
 * 数据加载器：按优先级加载数据
 */
export class DataLoader {
  /**
   * 加载数据（按优先级）
   * @param key 数据key
   * @param fetchFromDB 从数据库获取数据的函数
   * @param defaultValue 默认值
   * @returns 数据
   */
  static async load<T>(
    key: string,
    fetchFromDB?: () => Promise<T | null>,
    defaultValue?: T
  ): Promise<{ data: T | null; source: DataPriority }> {
    const priority = getDataPriority(key);
    
    // 高优先级：必须从数据库
    if (priority === DataPriority.DATABASE && fetchFromDB) {
      try {
        const dbData = await fetchFromDB();
        if (dbData !== null && dbData !== undefined) {
          // 同步到localStorage作为缓存
          userStorageJSON.set(key, dbData);
          return { data: dbData, source: DataPriority.DATABASE };
        }
      } catch (error) {
        console.error(`从数据库加载 ${key} 失败:`, error);
      }
    }
    
    // Fallback到localStorage
    const localData = userStorageJSON.get<T>(key);
    if (localData !== null) {
      return { data: localData, source: DataPriority.LOCAL_STORAGE };
    }
    
    // 最终fallback到默认值
    return { 
      data: defaultValue ?? null, 
      source: DataPriority.DEFAULT 
    };
  }
  
  /**
   * 保存数据（同时保存到数据库和localStorage）
   * @param key 数据key
   * @param value 数据值
   * @param saveToDB 保存到数据库的函数
   */
  static async save<T>(
    key: string,
    value: T,
    saveToDB?: (data: T) => Promise<void>
  ): Promise<boolean> {
    const priority = getDataPriority(key);
    
    // 总是保存到localStorage作为缓存
    userStorageJSON.set(key, value);
    
    // 高优先级数据必须保存到数据库
    if (priority === DataPriority.DATABASE && saveToDB) {
      try {
        await saveToDB(value);
        console.log(`✅ 数据已保存到数据库: ${key}`);
        return true;
      } catch (error) {
        console.error(`❌ 保存到数据库失败 ${key}:`, error);
        return false;
      }
    }
    
    return true; // localStorage保存成功
  }
  
  /**
   * 同步数据库数据到localStorage
   */
  static async syncFromDatabase<T>(
    key: string,
    fetchFromDB: () => Promise<T | null>
  ): Promise<boolean> {
    try {
      const dbData = await fetchFromDB();
      if (dbData !== null && dbData !== undefined) {
        userStorageJSON.set(key, dbData);
        console.log(`🔄 数据已同步: ${key}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`同步数据失败 ${key}:`, error);
      return false;
    }
  }
}

/**
 * 数据完整性检查
 * 确保关键数据不丢失
 */
export class DataIntegrityChecker {
  /**
   * 检查关键数据是否存在
   */
  static async checkIntegrity(userId: string): Promise<{
    missing: string[];
    ok: boolean;
  }> {
    const missing: string[] = [];
    
    for (const key of DATA_TYPE_CONFIG.HIGH_PRIORITY) {
      const localData = userStorageJSON.get(key);
      if (localData === null) {
        missing.push(key);
      }
    }
    
    return {
      missing,
      ok: missing.length === 0
    };
  }
  
  /**
   * 修复缺失数据（从数据库重新加载）
   */
  static async repairMissingData(
    missingKeys: string[],
    fetchFunctions: Record<string, () => Promise<any>>
  ): Promise<number> {
    let repaired = 0;
    
    for (const key of missingKeys) {
      const fetchFn = fetchFunctions[key];
      if (fetchFn) {
        try {
          const data = await fetchFn();
          if (data !== null) {
            userStorageJSON.set(key, data);
            repaired++;
            console.log(`✅ 修复数据: ${key}`);
          }
        } catch (error) {
          console.error(`❌ 修复失败 ${key}:`, error);
        }
      }
    }
    
    return repaired;
  }
}



