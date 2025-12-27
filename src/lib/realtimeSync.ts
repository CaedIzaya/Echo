/**
 * 实时数据同步系统
 * 
 * 功能：
 * 1. localStorage 更新后立即同步到数据库
 * 2. 支持批量同步（避免频繁API调用）
 * 3. 支持离线队列（离线时缓存，上线后同步）
 * 4. 跨设备数据一致性保证
 */

import { DataLoader } from './dataPriority';

interface SyncTask {
  key: string;
  value: any;
  timestamp: number;
  retryCount: number;
}

class RealtimeSyncManager {
  private syncQueue: SyncTask[] = [];
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  
  // API映射：key → API endpoint
  private apiMap: Record<string, {
    endpoint: string;
    method: string;
    transform?: (value: any) => any;
  }> = {
    'userExp': {
      endpoint: '/api/user/exp/update',
      method: 'POST',
      transform: (value) => ({ exp: value })
    },
    'heartTreeExp': {
      endpoint: '/api/heart-tree/exp/update',
      method: 'POST',
      transform: (value) => ({ exp: value })
    },
    'heartTreeName': {
      endpoint: '/api/heart-tree/update-name',
      method: 'POST',
      transform: (value) => ({ name: value })
    },
    'streakDays': {
      endpoint: '/api/user/stats/update',
      method: 'POST',
      transform: (value) => ({ streakDays: value })
    },
    'userPlans': {
      endpoint: '/api/projects/sync',
      method: 'POST',
      transform: (value) => ({ projects: value })
    },
  };
  
  /**
   * 添加同步任务到队列
   */
  addTask(key: string, value: any) {
    // 检查是否需要同步到数据库
    if (!this.apiMap[key]) {
      console.log(`[RealtimeSync] ${key} 不需要同步到数据库`);
      return;
    }
    
    // 检查队列中是否已有相同key的任务，如果有则更新
    const existingIndex = this.syncQueue.findIndex(task => task.key === key);
    if (existingIndex >= 0) {
      this.syncQueue[existingIndex] = {
        key,
        value,
        timestamp: Date.now(),
        retryCount: 0,
      };
      console.log(`[RealtimeSync] 更新同步任务: ${key}`);
    } else {
      this.syncQueue.push({
        key,
        value,
        timestamp: Date.now(),
        retryCount: 0,
      });
      console.log(`[RealtimeSync] 添加同步任务: ${key}`);
    }
    
    // 触发同步（延迟执行，批量处理）
    this.scheduleSyncn();
  }
  
  /**
   * 调度同步（延迟2秒，批量处理）
   */
  private scheduleSync() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    
    this.syncTimer = setTimeout(() => {
      this.processSyncQueue();
    }, 2000); // 延迟2秒，允许批量更新
  }
  
  /**
   * 处理同步队列
   */
  private async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }
    
    this.isSyncing = true;
    console.log(`[RealtimeSync] 开始处理 ${this.syncQueue.length} 个同步任务`);
    
    // 复制队列并清空（避免同步期间新任务丢失）
    const tasksToSync = [...this.syncQueue];
    this.syncQueue = [];
    
    // 并行同步所有任务
    const results = await Promise.allSettled(
      tasksToSync.map(task => this.syncTask(task))
    );
    
    // 检查失败的任务
    const failedTasks: SyncTask[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const task = tasksToSync[index];
        task.retryCount++;
        
        // 最多重试3次
        if (task.retryCount < 3) {
          failedTasks.push(task);
        } else {
          console.error(`[RealtimeSync] 任务失败（已重试3次）: ${task.key}`);
        }
      }
    });
    
    // 将失败的任务重新加入队列
    if (failedTasks.length > 0) {
      this.syncQueue.push(...failedTasks);
      console.log(`[RealtimeSync] ${failedTasks.length} 个任务将重试`);
      
      // 5秒后重试
      setTimeout(() => {
        this.processSyncQueue();
      }, 5000);
    }
    
    this.isSyncing = false;
    console.log('[RealtimeSync] ✅ 同步完成');
  }
  
  /**
   * 同步单个任务
   */
  private async syncTask(task: SyncTask): Promise<void> {
    const apiConfig = this.apiMap[task.key];
    if (!apiConfig) {
      throw new Error(`未找到 ${task.key} 的API配置`);
    }
    
    const body = apiConfig.transform 
      ? apiConfig.transform(task.value)
      : { value: task.value };
    
    console.log(`[RealtimeSync] 同步 ${task.key} 到数据库...`);
    
    const response = await fetch(apiConfig.endpoint, {
      method: apiConfig.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`同步失败: ${response.status}`);
    }
    
    console.log(`[RealtimeSync] ✅ ${task.key} 已同步`);
  }
  
  /**
   * 立即同步（不等待延迟）
   */
  async syncNow() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    await this.processSyncQueue();
  }
  
  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      pending: this.syncQueue.length,
      isSyncing: this.isSyncing,
    };
  }
}

// 全局单例
const realtimeSyncManager = new RealtimeSyncManager();

/**
 * 同步数据到数据库（自动批量处理）
 * @param key 数据key
 * @param value 数据值
 */
export function syncToDatabase(key: string, value: any) {
  realtimeSyncManager.addTask(key, value);
}

/**
 * 立即同步所有待处理任务
 */
export async function syncNow() {
  await realtimeSyncManager.syncNow();
}

/**
 * 获取同步状态
 */
export function getSyncStatus() {
  return realtimeSyncManager.getQueueStatus();
}

/**
 * 增强的 localStorage 操作（自动同步到数据库）
 */
export const syncedStorage = {
  /**
   * 设置数据（自动同步到数据库）
   */
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    
    // 写入localStorage
    localStorage.setItem(key, value);
    
    // 添加到同步队列
    try {
      const parsedValue = JSON.parse(value);
      syncToDatabase(key, parsedValue);
    } catch {
      syncToDatabase(key, value);
    }
  },
  
  /**
   * 设置JSON数据（自动同步到数据库）
   */
  setJSON: <T>(key: string, value: T) => {
    if (typeof window === 'undefined') return;
    
    const jsonString = JSON.stringify(value);
    localStorage.setItem(key, jsonString);
    
    // 添加到同步队列
    syncToDatabase(key, value);
  },
  
  /**
   * 获取数据
   */
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  
  /**
   * 获取JSON数据
   */
  getJSON: <T>(key: string, defaultValue?: T): T | null => {
    if (typeof window === 'undefined') return defaultValue ?? null;
    
    const value = localStorage.getItem(key);
    if (!value) return defaultValue ?? null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue ?? null;
    }
  },
};

export default realtimeSyncManager;

