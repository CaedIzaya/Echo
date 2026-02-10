/**
 * 版本管理和 localStorage 清理系统
 * 
 * 功能：
 * 1. 检测应用版本变化
 * 2. 自动清理旧版本的 localStorage
 * 3. 修复损坏的数据
 */

const CURRENT_VERSION = '2.0.0'; // 🔥 重要：每次需要清理 localStorage 时更新这个版本号
const VERSION_KEY = 'app_version';
const LAST_CLEANUP_KEY = 'last_cleanup_at';

interface CleanupResult {
  needsCleanup: boolean;
  reason: string;
  oldVersion: string | null;
  clearedKeys: string[];
}

/**
 * 检查是否需要清理 localStorage
 */
export function checkNeedsCleanup(): { needsCleanup: boolean; reason: string } {
  if (typeof window === 'undefined') {
    return { needsCleanup: false, reason: 'SSR' };
  }

  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    
    // 情况1：首次访问或没有版本号
    if (!storedVersion) {
      return { 
        needsCleanup: true, 
        reason: '首次访问或旧版本（无版本号）' 
      };
    }
    
    // 情况2：版本号不匹配
    if (storedVersion !== CURRENT_VERSION) {
      return { 
        needsCleanup: true, 
        reason: `版本更新 (${storedVersion} → ${CURRENT_VERSION})` 
      };
    }
    
    // 情况3：检测到损坏的数据
    const corruptedKeys = detectCorruptedData();
    if (corruptedKeys.length > 0) {
      return { 
        needsCleanup: true, 
        reason: `检测到损坏的数据: ${corruptedKeys.join(', ')}` 
      };
    }
    
    return { needsCleanup: false, reason: '版本匹配，数据正常' };
  } catch (error) {
    console.error('[versionManager] 检查失败:', error);
    return { needsCleanup: true, reason: '检查异常，安全起见清理' };
  }
}

/**
 * 检测损坏的数据
 */
function detectCorruptedData(): string[] {
  const corruptedKeys: string[] = [];
  
  try {
    // 检查成就数据
    const achievedAchievements = localStorage.getItem('achievedAchievements');
    if (achievedAchievements) {
      try {
        const parsed = JSON.parse(achievedAchievements);
        if (!Array.isArray(parsed)) {
          corruptedKeys.push('achievedAchievements');
        }
      } catch {
        corruptedKeys.push('achievedAchievements');
      }
    }
    
    // 检查用户经验
    const userExp = localStorage.getItem('userExp');
    if (userExp && (isNaN(Number(userExp)) || Number(userExp) < 0)) {
      corruptedKeys.push('userExp');
    }
    
    // 检查今日统计
    const todayStats = localStorage.getItem('todayStats');
    if (todayStats) {
      try {
        const parsed = JSON.parse(todayStats);
        if (typeof parsed !== 'object' || parsed === null) {
          corruptedKeys.push('todayStats');
        }
      } catch {
        corruptedKeys.push('todayStats');
      }
    }
    
  } catch (error) {
    console.error('[versionManager] 数据检测失败:', error);
  }
  
  return corruptedKeys;
}

/**
 * 清理 localStorage
 */
export function cleanupLocalStorage(userId?: string): CleanupResult {
  if (typeof window === 'undefined') {
    return {
      needsCleanup: false,
      reason: 'SSR',
      oldVersion: null,
      clearedKeys: [],
    };
  }

  const oldVersion = localStorage.getItem(VERSION_KEY);
  const clearedKeys: string[] = [];
  
  try {
    console.log('[versionManager] 🧹 开始清理 localStorage...');
    console.log('[versionManager] 旧版本:', oldVersion || '无');
    console.log('[versionManager] 新版本:', CURRENT_VERSION);
    
    // 🔥 保留的关键数据（如果有userId，说明用户已登录，可以从数据库恢复）
    const keysToPreserve = [
      'theme', // 主题偏好
      'chakra-ui-color-mode', // Chakra UI 主题
    ];
    
    // 获取所有 keys
    const allKeys = Object.keys(localStorage);
    
    // 清理所有非保留的 keys
    for (const key of allKeys) {
      if (!keysToPreserve.includes(key)) {
        localStorage.removeItem(key);
        clearedKeys.push(key);
      }
    }
    
    // 设置新版本号
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    localStorage.setItem(LAST_CLEANUP_KEY, new Date().toISOString());
    localStorage.setItem('just_cleaned_cache', 'true'); // 🔥 标记刚清理过，避免 DataIntegrity 误判
    
    console.log('[versionManager] ✅ 清理完成，已清除', clearedKeys.length, '个键');
    console.log('[versionManager] 保留的键:', keysToPreserve.join(', '));
    
    return {
      needsCleanup: true,
      reason: `版本更新 (${oldVersion} → ${CURRENT_VERSION})`,
      oldVersion,
      clearedKeys,
    };
    
  } catch (error) {
    console.error('[versionManager] ❌ 清理失败:', error);
    return {
      needsCleanup: false,
      reason: '清理失败',
      oldVersion,
      clearedKeys: [],
    };
  }
}

/**
 * 强制清理（用于手动触发）
 */
export function forceCleanup(userId?: string): void {
  console.log('[versionManager] 🔥 强制清理 localStorage');
  cleanupLocalStorage(userId);
  
  // 刷新页面以重新加载数据
  if (typeof window !== 'undefined') {
    console.log('[versionManager] 🔄 刷新页面以重新加载数据...');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
}

/**
 * 获取当前版本信息
 */
export function getVersionInfo() {
  if (typeof window === 'undefined') {
    return {
      currentVersion: CURRENT_VERSION,
      storedVersion: null,
      lastCleanup: null,
    };
  }
  
  return {
    currentVersion: CURRENT_VERSION,
    storedVersion: localStorage.getItem(VERSION_KEY),
    lastCleanup: localStorage.getItem(LAST_CLEANUP_KEY),
  };
}









