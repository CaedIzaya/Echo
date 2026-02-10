/**
 * 调试工具 - 追踪 useEffect 执行
 */

interface EffectLog {
  hookName: string;
  effectName: string;
  timestamp: number;
  count: number;
}

const effectCounts = new Map<string, number>();
const effectLogs: EffectLog[] = [];
const MAX_LOGS = 100;

/**
 * 追踪 useEffect 执行
 * 用法：在 useEffect 开头调用
 * 
 * @example
 * useEffect(() => {
 *   trackEffect('useAchievements', 'loadFromDatabase');
 *   // ... 你的代码
 * }, [deps]);
 */
export function trackEffect(hookName: string, effectName: string) {
  const key = `${hookName}:${effectName}`;
  const count = (effectCounts.get(key) || 0) + 1;
  effectCounts.set(key, count);

  const log: EffectLog = {
    hookName,
    effectName,
    timestamp: Date.now(),
    count,
  };

  effectLogs.push(log);
  if (effectLogs.length > MAX_LOGS) {
    effectLogs.shift();
  }

  // 检测可能的无限循环
  if (count > 10) {
    console.warn(
      `[DebugTools] ⚠️ 可能的无限循环: ${key} 已执行 ${count} 次`,
      log
    );
  }

  if (count > 50) {
    console.error(
      `[DebugTools] 🚨 无限循环确认: ${key} 已执行 ${count} 次！`,
      log
    );
    
    // 打印最近的执行历史
    const recentLogs = effectLogs.filter(l => l.hookName === hookName);
    console.error('[DebugTools] 最近执行历史:', recentLogs.slice(-10));
  }

  // 始终打印当前执行
  console.log(
    `[DebugTools] ${count <= 5 ? '✓' : count <= 10 ? '⚠️' : '🚨'} ${key} #${count}`,
    {
      time: new Date(log.timestamp).toISOString(),
      count: log.count,
    }
  );
}

/**
 * 获取执行统计
 */
export function getEffectStats() {
  const stats = Array.from(effectCounts.entries()).map(([key, count]) => ({
    key,
    count,
  }));
  
  stats.sort((a, b) => b.count - a.count);
  
  return {
    total: effectLogs.length,
    uniqueEffects: effectCounts.size,
    topExecuted: stats.slice(0, 10),
    recentLogs: effectLogs.slice(-20),
  };
}

/**
 * 打印执行统计
 */
export function printEffectStats() {
  const stats = getEffectStats();
  
  console.group('[DebugTools] useEffect 执行统计');
  console.log('总执行次数:', stats.total);
  console.log('不同 effect:', stats.uniqueEffects);
  console.log('\n执行最多的 effects:');
  console.table(stats.topExecuted);
  console.log('\n最近 20 次执行:');
  console.table(stats.recentLogs);
  console.groupEnd();
}

/**
 * 重置统计
 */
export function resetEffectStats() {
  effectCounts.clear();
  effectLogs.length = 0;
  console.log('[DebugTools] 统计已重置');
}

/**
 * 追踪组件渲染
 */
const renderCounts = new Map<string, number>();
const renderReasons = new Map<string, string[]>();

export function trackRender(componentName: string, reason?: string) {
  const count = (renderCounts.get(componentName) || 0) + 1;
  renderCounts.set(componentName, count);

  // 记录渲染原因
  if (reason) {
    const reasons = renderReasons.get(componentName) || [];
    reasons.push(`#${count}: ${reason}`);
    if (reasons.length > 20) reasons.shift(); // 只保留最近20次
    renderReasons.set(componentName, reasons);
  }

  const prefix = count <= 5 ? '✓' : count <= 10 ? '⚠️' : '🚨';
  console.log(
    `[DebugTools] ${prefix} ${componentName} 渲染 #${count}`,
    reason ? { reason } : ''
  );

  if (count > 10) {
    console.warn(
      `[DebugTools] ⚠️ 组件重复渲染: ${componentName} 已渲染 ${count} 次`
    );
    
    // 打印渲染原因历史
    const reasons = renderReasons.get(componentName);
    if (reasons) {
      console.warn('[DebugTools] 渲染原因历史:', reasons);
    }
  }

  if (count > 50) {
    console.error(
      `[DebugTools] 🚨 组件无限渲染: ${componentName} 已渲染 ${count} 次！`
    );
  }

  return count;
}

/**
 * 追踪 state 更新
 */
const stateUpdateCounts = new Map<string, number>();

export function trackStateUpdate(componentName: string, stateName: string, newValue: any) {
  const key = `${componentName}:${stateName}`;
  const count = (stateUpdateCounts.get(key) || 0) + 1;
  stateUpdateCounts.set(key, count);

  const prefix = count <= 5 ? '✓' : count <= 10 ? '⚠️' : '🚨';
  console.log(
    `[DebugTools] ${prefix} State更新 ${key} #${count}`,
    { newValue: typeof newValue === 'object' ? JSON.stringify(newValue).substring(0, 100) : newValue }
  );

  if (count > 10) {
    console.warn(
      `[DebugTools] ⚠️ State频繁更新: ${key} 已更新 ${count} 次`,
      { latestValue: newValue }
    );
  }

  return count;
}

export function getStateUpdateStats() {
  const stats = Array.from(stateUpdateCounts.entries()).map(([key, count]) => ({
    key,
    count,
  }));
  
  stats.sort((a, b) => b.count - a.count);
  
  return stats;
}

export function printStateUpdateStats() {
  const stats = getStateUpdateStats();
  
  console.group('[DebugTools] State 更新统计');
  console.log('总更新次数:', Array.from(stateUpdateCounts.values()).reduce((a, b) => a + b, 0));
  console.log('不同 state:', stats.length);
  console.table(stats.slice(0, 20));
  console.groupEnd();
}

export function getRenderStats() {
  const stats = Array.from(renderCounts.entries()).map(([name, count]) => ({
    component: name,
    count,
  }));
  
  stats.sort((a, b) => b.count - a.count);
  
  return stats;
}

export function printRenderStats() {
  const stats = getRenderStats();
  
  console.group('[DebugTools] 组件渲染统计');
  console.log('总组件数:', stats.length);
  console.table(stats);
  console.groupEnd();
}

// 暴露到 window 供调试使用
if (typeof window !== 'undefined') {
  (window as any).debugTools = {
    getEffectStats,
    printEffectStats,
    resetEffectStats,
    getRenderStats,
    printRenderStats,
    getStateUpdateStats,
    printStateUpdateStats,
  };
  
  console.log(
    '[DebugTools] 调试工具已加载！\n' +
    '使用方法:\n' +
    '  window.debugTools.printEffectStats() - 查看 useEffect 统计\n' +
    '  window.debugTools.printRenderStats() - 查看组件渲染统计\n' +
    '  window.debugTools.printStateUpdateStats() - 查看 State 更新统计\n' +
    '  window.debugTools.resetEffectStats() - 重置统计'
  );
}


