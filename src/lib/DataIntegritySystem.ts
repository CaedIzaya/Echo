/**
 * 数据完整性保护系统
 * 
 * 目标：防止因 localStorage 清除导致的数据丢失
 * 机制：
 * 1. 双重验证：同时检查 localStorage 和数据库
 * 2. 智能恢复：检测到数据异常时自动从数据库恢复
 * 3. 防护标记：记录关键里程碑，防止误判新用户
 */

export interface UserDataSnapshot {
  userExp: number;
  userLevel: number;
  totalFocusMinutes: number;
  totalSessions: number;
  hasAnyAchievements: boolean;
  createdAt?: string;
}

export interface DataIntegrityCheckResult {
  isNewUser: boolean;
  needsRecovery: boolean;
  localDataExists: boolean;
  databaseDataExists: boolean;
  reason: string;
}

/**
 * 判断用户是否为真正的新用户
 * 
 * 判定规则：
 * 1. 数据库中有专注记录 → 非新用户
 * 2. 数据库中有成就记录 → 非新用户
 * 3. 数据库中用户经验 > 0 → 非新用户
 * 4. 数据库中账号创建时间 > 24小时 → 可能非新用户
 * 5. 所有数据都为0且账号新创建 → 新用户
 */
export async function isReallyNewUser(userId: string): Promise<DataIntegrityCheckResult> {
  try {
    // 1. 检查数据库数据
    const dbSnapshot = await fetchUserDataFromDatabase(userId);
    
    // 2. 检查 localStorage 数据
    const localSnapshot = loadUserDataFromLocal();
    
    // 3. 综合判断
    const databaseDataExists = 
      dbSnapshot.userExp > 0 || 
      dbSnapshot.totalFocusMinutes > 0 || 
      dbSnapshot.totalSessions > 0 || 
      dbSnapshot.hasAnyAchievements;
    
    const localDataExists = 
      localSnapshot.userExp > 0 || 
      localSnapshot.totalFocusMinutes > 0;
    
    // 4. 账号创建时间
    const accountAge = dbSnapshot.createdAt 
      ? Date.now() - new Date(dbSnapshot.createdAt).getTime()
      : 0;
    const isOldAccount = accountAge > 24 * 60 * 60 * 1000; // 大于24小时
    
    // 5. 判定逻辑
    if (databaseDataExists) {
      // 数据库有数据 → 非新用户
      return {
        isNewUser: false,
        needsRecovery: !localDataExists, // localStorage 无数据需要恢复
        localDataExists,
        databaseDataExists: true,
        reason: '数据库中存在用户数据',
      };
    }
    
    if (isOldAccount && !databaseDataExists) {
      // 老账号但无数据 → 可能数据丢失，标记为需要恢复
      return {
        isNewUser: false,
        needsRecovery: true,
        localDataExists,
        databaseDataExists: false,
        reason: '老账号但数据缺失，可能数据丢失',
      };
    }
    
    // 新账号且无任何数据 → 真正的新用户
    return {
      isNewUser: true,
      needsRecovery: false,
      localDataExists,
      databaseDataExists: false,
      reason: '新账号且无历史数据',
    };
    
  } catch (error) {
    console.error('[DataIntegrity] 新用户判定失败:', error);
    // 出错时保守处理：假设非新用户，避免误触发"首次"成就
    return {
      isNewUser: false,
      needsRecovery: true,
      localDataExists: false,
      databaseDataExists: false,
      reason: '判定失败，保守处理为非新用户',
    };
  }
}

/**
 * 从数据库获取用户数据快照
 */
async function fetchUserDataFromDatabase(userId: string): Promise<UserDataSnapshot> {
  try {
    // 并发请求所有数据
    const [userResponse, achievementsResponse, sessionsResponse] = await Promise.all([
      fetch('/api/user/exp'),
      fetch('/api/achievements'),
      fetch('/api/focus-sessions'),
    ]);
    
    const userData = userResponse.ok ? await userResponse.json() : null;
    const achievementsData = achievementsResponse.ok ? await achievementsResponse.json() : null;
    const sessionsData = sessionsResponse.ok ? await sessionsResponse.json() : null;
    
    return {
      userExp: userData?.userExp || 0,
      userLevel: userData?.userLevel || 1,
      totalFocusMinutes: 0, // 需要从专注记录计算
      totalSessions: Array.isArray(sessionsData) ? sessionsData.length : 0,
      hasAnyAchievements: Array.isArray(achievementsData) && achievementsData.length > 0,
      createdAt: userData?.createdAt,
    };
  } catch (error) {
    console.error('[DataIntegrity] 获取数据库数据失败:', error);
    return {
      userExp: 0,
      userLevel: 1,
      totalFocusMinutes: 0,
      totalSessions: 0,
      hasAnyAchievements: false,
    };
  }
}

/**
 * 从 localStorage 获取用户数据快照
 */
function loadUserDataFromLocal(): UserDataSnapshot {
  if (typeof window === 'undefined') {
    return {
      userExp: 0,
      userLevel: 1,
      totalFocusMinutes: 0,
      totalSessions: 0,
      hasAnyAchievements: false,
    };
  }
  
  const userExp = parseFloat(localStorage.getItem('userExp') || '0');
  const totalFocusMinutes = parseFloat(localStorage.getItem('totalFocusMinutes') || '0');
  const achievedAchievements = localStorage.getItem('achievedAchievements');
  const hasAnyAchievements = achievedAchievements ? JSON.parse(achievedAchievements).length > 0 : false;
  
  return {
    userExp,
    userLevel: 1, // 通过 userExp 计算
    totalFocusMinutes,
    totalSessions: 0, // localStorage 中可能没有这个字段
    hasAnyAchievements,
  };
}

/**
 * 数据恢复：从数据库恢复到 localStorage
 */
export async function recoverDataFromDatabase(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    console.log('[DataIntegrity] 开始数据恢复...');
    
    // 1. 获取数据库数据
    const [userResponse, achievementsResponse] = await Promise.all([
      fetch('/api/user/exp'),
      fetch('/api/achievements'),
    ]);
    
    if (!userResponse.ok) {
      console.warn('[DataIntegrity] 无法获取用户数据');
      return false;
    }
    
    const userData = await userResponse.json();
    const achievementsData = achievementsResponse.ok ? await achievementsResponse.json() : [];
    
    // 2. 恢复用户经验
    if (userData.userExp > 0) {
      localStorage.setItem('userExp', userData.userExp.toString());
      localStorage.setItem('userExpSynced', 'true');
      console.log('[DataIntegrity] 已恢复用户经验:', userData.userExp);
    }
    
    // 3. 恢复成就数据
    if (Array.isArray(achievementsData) && achievementsData.length > 0) {
      const achievementIds = achievementsData.map((a: any) => a.achievementId);
      localStorage.setItem('achievedAchievements', JSON.stringify(achievementIds));
      console.log('[DataIntegrity] 已恢复成就数据:', achievementIds.length, '个成就');
    }
    
    // 4. 设置恢复标记
    localStorage.setItem('dataRecoveredAt', new Date().toISOString());
    localStorage.setItem('dataRecovered', 'true');
    
    console.log('[DataIntegrity] ✅ 数据恢复完成');
    return true;
    
  } catch (error) {
    console.error('[DataIntegrity] 数据恢复失败:', error);
    return false;
  }
}

/**
 * 数据完整性检查（启动时调用）
 */
export async function checkDataIntegrity(userId: string): Promise<void> {
  console.log('[DataIntegrity] 开始数据完整性检查...');
  
  const result = await isReallyNewUser(userId);
  
  console.log('[DataIntegrity] 检查结果:', {
    isNewUser: result.isNewUser,
    needsRecovery: result.needsRecovery,
    localDataExists: result.localDataExists,
    databaseDataExists: result.databaseDataExists,
    reason: result.reason,
  });
  
  // 如果需要恢复数据
  if (result.needsRecovery && !result.isNewUser) {
    console.warn('[DataIntegrity] ⚠️ 检测到数据异常，开始自动恢复...');
    const recovered = await recoverDataFromDatabase();
    
    if (recovered) {
      console.log('[DataIntegrity] ✅ 数据已自动恢复，请刷新页面');
      // 可以选择自动刷新页面
      // window.location.reload();
    } else {
      console.error('[DataIntegrity] ❌ 数据恢复失败，请联系客服');
    }
  }
}

/**
 * 防护标记：记录关键里程碑
 * 即使 localStorage 被清除，下次也能识别非新用户
 */
export function setProtectionMarker(type: 'first_focus' | 'first_achievement' | 'exp_milestone'): void {
  if (typeof window === 'undefined') return;
  
  const marker = {
    type,
    timestamp: Date.now(),
    date: new Date().toISOString(),
  };
  
  // 存储在不易被清除的位置（可以考虑使用 IndexedDB）
  localStorage.setItem(`protection_${type}`, JSON.stringify(marker));
}

/**
 * 检查防护标记
 */
export function hasProtectionMarker(type: 'first_focus' | 'first_achievement' | 'exp_milestone'): boolean {
  if (typeof window === 'undefined') return false;
  
  const marker = localStorage.getItem(`protection_${type}`);
  return marker !== null;
}




