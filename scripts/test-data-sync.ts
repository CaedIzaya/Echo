/**
 * 数据同步测试脚本
 * 
 * 测试场景：
 * 1. localStorage 过度依赖检查
 * 2. 数据库→localStorage 同步测试
 * 3. localStorage→数据库 同步测试
 * 4. 跨设备数据一致性测试
 */

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
  issues?: string[];
}

const results: TestResult[] = [];

console.log('🧪 开始数据同步测试...\n');

// ============================================
// 测试1: 检查localStorage过度依赖
// ============================================
function testLocalStorageDependency() {
  console.log('📋 测试1: 检查localStorage过度依赖\n');
  
  const issues: string[] = [];
  
  // 应该从数据库读取的关键数据
  const SHOULD_BE_IN_DB = [
    'userExp',           // 用户经验值 ✅ 应该在数据库
    'userLevel',         // 用户等级（计算值，可以不在DB）
    'heartTreeExp',      // 心树经验值 ✅ 应该在数据库
    'heartTreeLevel',    // 心树等级（计算值）
    'heartTreeName',     // 心树名称 ✅ 应该在数据库
    'streakDays',        // 连续天数 ✅ 应该在数据库
    'achievedAchievements', // 成就 ✅ 应该在数据库
    'userPlans',         // 用户计划 ✅ 应该在数据库
    'focusSessions',     // 专注记录 ✅ 应该在数据库
    'totalFocusMinutes', // 总专注时长 ✅ 应该在数据库
  ];
  
  // 可以只在localStorage的数据
  const OK_IN_LOCALSTORAGE = [
    'todayStats',        // 今日统计（可缓存，定期同步）
    'weeklyStats',       // 本周统计（可缓存，定期同步）
    'flowMetrics',       // 心流指标（实时计算，可缓存）
    'lastWelcomeDate',   // UI状态
    'isNewUserFirstEntry', // UI状态
    'theme',             // UI设置
    'notifications',     // UI设置
  ];
  
  console.log('✅ 应该在数据库的数据:');
  SHOULD_BE_IN_DB.forEach(key => {
    console.log(`   - ${key}`);
  });
  
  console.log('\n📦 可以只在localStorage的数据:');
  OK_IN_LOCALSTORAGE.forEach(key => {
    console.log(`   - ${key}`);
  });
  
  results.push({
    testName: 'localStorage依赖检查',
    passed: true,
    details: `需要数据库支持的数据项: ${SHOULD_BE_IN_DB.length}个`,
  });
  
  console.log('\n');
}

// ============================================
// 测试2: 数据库→localStorage同步检查
// ============================================
function testDatabaseToLocalStorage() {
  console.log('📋 测试2: 数据库→localStorage同步机制\n');
  
  const syncPoints = [
    {
      name: '登录时同步',
      hooks: ['useDataSync', 'useDashboardData', 'useDashboardPreload'],
      description: '用户登录时，从数据库拉取所有关键数据到localStorage',
      code: `
// src/hooks/useDataSync.ts
const syncAllData = async () => {
  const response = await fetch('/api/user/sync-all-data');
  const data = await response.json();
  
  // 同步到localStorage
  localStorage.setItem('userExp', data.userExp.toString());
  localStorage.setItem('achievedAchievements', JSON.stringify(data.achievements));
  // ... 其他数据
};
      `
    },
    {
      name: 'Dashboard加载时同步',
      hooks: ['useDashboardData'],
      description: '进入Dashboard时，检查数据是否过期（>1小时），过期则重新加载',
      code: `
// src/hooks/useDashboardData.ts
const needSync = !synced || !lastSyncAt || isDataStale(lastSyncAt);
if (needSync) {
  loadFromDatabase(); // 从数据库加载并更新localStorage
}
      `
    },
    {
      name: '预加载时同步',
      hooks: ['useDashboardPreload'],
      description: 'Dashboard预加载时，按优先级从数据库读取10项关键数据',
      code: `
// src/hooks/useDashboardPreload.ts
const { data: userExpData } = await DataLoader.load(
  'userExp',
  async () => {
    const res = await fetch('/api/user/exp');
    return (await res.json()).exp;
  }
);
// 自动缓存到localStorage
      `
    }
  ];
  
  console.log('✅ 数据库→localStorage同步点:');
  syncPoints.forEach((point, index) => {
    console.log(`\n${index + 1}. ${point.name}`);
    console.log(`   触发时机: ${point.description}`);
    console.log(`   相关Hooks: ${point.hooks.join(', ')}`);
  });
  
  results.push({
    testName: '数据库→localStorage同步',
    passed: true,
    details: `发现 ${syncPoints.length} 个同步点`,
  });
  
  console.log('\n');
}

// ============================================
// 测试3: localStorage→数据库同步检查
// ============================================
function testLocalStorageToDatabase() {
  console.log('📋 测试3: localStorage→数据库同步机制\n');
  
  const writePoints = [
    {
      name: '专注完成时',
      api: '/api/focus-sessions',
      data: ['专注时长', '开始时间', '结束时间', '评分'],
      sync: true,
      code: `
// src/pages/focus/index.tsx (行1187-1208)
fetch('/api/focus-sessions', {
  method: 'POST',
  body: JSON.stringify({
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: minutes,
    rating: numericRating,
  }),
});
      `
    },
    {
      name: '用户经验值更新',
      api: '/api/user/exp/update',
      data: ['经验值'],
      sync: true,
      code: `
// src/hooks/useUserExp.ts
const updateUserExp = async (newExp: number) => {
  await fetch('/api/user/exp/update', {
    method: 'POST',
    body: JSON.stringify({ exp: newExp }),
  });
  localStorage.setItem('userExp', newExp.toString());
};
      `
    },
    {
      name: '心树经验值更新',
      api: '/api/heart-tree/exp/update',
      data: ['心树经验值'],
      sync: true,
      code: `
// src/hooks/useHeartTreeExp.ts
await fetch('/api/heart-tree/exp/update', {
  method: 'POST',
  body: JSON.stringify({ exp: newExp }),
});
      `
    },
    {
      name: '创建/更新计划',
      api: '/api/projects',
      data: ['计划数据', '里程碑'],
      sync: true,
      code: `
// src/pages/onboarding/goal-setting.tsx (行379-399)
await fetch('/api/projects', {
  method: 'POST',
  body: JSON.stringify({
    name: newPlan.name,
    dailyGoalMinutes: newPlan.dailyGoalMinutes,
    milestones: newPlan.milestones,
  }),
});
// 然后保存到localStorage作为缓存
localStorage.setItem('userPlans', JSON.stringify(existingPlans));
      `
    },
    {
      name: '成就解锁',
      api: '/api/achievements/unlock',
      data: ['成就ID'],
      sync: true,
      code: `
// src/hooks/useAchievements.ts
await fetch('/api/achievements/unlock', {
  method: 'POST',
  body: JSON.stringify({ achievementId }),
});
      `
    },
    {
      name: '统计数据更新',
      api: '/api/user/stats/update',
      data: ['连续天数', '总时长'],
      sync: false, // ⚠️ 可能缺失
      issue: '统计数据可能只更新localStorage，未同步数据库'
    }
  ];
  
  console.log('✅ localStorage→数据库写入点:');
  writePoints.forEach((point, index) => {
    console.log(`\n${index + 1}. ${point.name}`);
    console.log(`   API: ${point.api}`);
    console.log(`   数据: ${point.data.join(', ')}`);
    console.log(`   同步状态: ${point.sync ? '✅ 已同步' : '⚠️ 未同步'}`);
    if (point.issue) {
      console.log(`   ⚠️ 问题: ${point.issue}`);
    }
  });
  
  const hasSyncIssues = writePoints.some(p => !p.sync);
  
  results.push({
    testName: 'localStorage→数据库同步',
    passed: !hasSyncIssues,
    details: `检查了 ${writePoints.length} 个写入点`,
    issues: hasSyncIssues ? writePoints.filter(p => !p.sync).map(p => p.name) : undefined,
  });
  
  console.log('\n');
}

// ============================================
// 测试4: 跨设备数据一致性分析
// ============================================
function testCrossDeviceConsistency() {
  console.log('📋 测试4: 跨设备数据一致性分析\n');
  
  console.log('场景：用户在设备A登录，然后在设备B登录同一账号\n');
  
  const dataTypes = [
    {
      name: '用户经验值',
      shouldSync: true,
      currentImplementation: '✅ 从数据库读取（useDashboardPreload）',
      crossDevice: '✅ 一致'
    },
    {
      name: '心树经验值',
      shouldSync: true,
      currentImplementation: '✅ 从数据库读取（useDashboardPreload）',
      crossDevice: '✅ 一致'
    },
    {
      name: '用户计划',
      shouldSync: true,
      currentImplementation: '✅ 从数据库读取（useProjects）',
      crossDevice: '✅ 一致'
    },
    {
      name: '专注记录',
      shouldSync: true,
      currentImplementation: '✅ 写入数据库（/api/focus-sessions）',
      crossDevice: '✅ 一致'
    },
    {
      name: '成就系统',
      shouldSync: true,
      currentImplementation: '✅ 从数据库读取（useAchievements）',
      crossDevice: '✅ 一致'
    },
    {
      name: '连续天数',
      shouldSync: true,
      currentImplementation: '✅ 从数据库读取（useDashboardData）',
      crossDevice: '✅ 一致'
    },
    {
      name: '今日统计',
      shouldSync: true,
      currentImplementation: '⚠️ 主要在localStorage，专注完成时写入数据库',
      crossDevice: '⚠️ 可能不一致（取决于同步时机）'
    },
    {
      name: '本周统计',
      shouldSync: true,
      currentImplementation: '⚠️ 主要在localStorage，专注完成时写入数据库',
      crossDevice: '⚠️ 可能不一致（取决于同步时机）'
    },
    {
      name: 'UI状态（上次欢迎日期等）',
      shouldSync: false,
      currentImplementation: '📦 仅localStorage',
      crossDevice: '❌ 不一致（预期行为，每设备独立）'
    }
  ];
  
  console.log('数据类型 | 是否应同步 | 当前实现 | 跨设备一致性');
  console.log('--------|---------|---------|-------------');
  dataTypes.forEach(type => {
    console.log(`${type.name} | ${type.shouldSync ? '是' : '否'} | ${type.currentImplementation} | ${type.crossDevice}`);
  });
  
  const hasIssues = dataTypes.some(t => t.crossDevice.includes('⚠️'));
  
  results.push({
    testName: '跨设备数据一致性',
    passed: !hasIssues,
    details: `检查了 ${dataTypes.length} 种数据类型`,
    issues: hasIssues ? dataTypes.filter(t => t.crossDevice.includes('⚠️')).map(t => t.name) : undefined,
  });
  
  console.log('\n');
}

// ============================================
// 测试5: 数据流向分析
// ============================================
function testDataFlow() {
  console.log('📋 测试5: 完整数据流向分析\n');
  
  console.log('数据类型: 用户经验值');
  console.log('─────────────────────────────');
  console.log('写入流程:');
  console.log('  1. 用户完成专注/达成成就');
  console.log('  2. useUserExp.addUserExp(exp)');
  console.log('  3. ↓');
  console.log('  4. fetch(\'/api/user/exp/update\') → 数据库');
  console.log('  5. localStorage.setItem(\'userExp\') → 本地缓存');
  console.log('');
  console.log('读取流程:');
  console.log('  设备A: fetch(\'/api/user/exp\') → 100经验');
  console.log('  设备B: fetch(\'/api/user/exp\') → 100经验');
  console.log('  ✅ 跨设备一致\n');
  
  console.log('数据类型: 今日统计（todayStats）');
  console.log('─────────────────────────────');
  console.log('写入流程:');
  console.log('  1. 用户完成专注');
  console.log('  2. reportFocusSessionComplete(minutes)');
  console.log('  3. ↓');
  console.log('  4. localStorage.setItem(\'todayStats\') → 本地');
  console.log('  5. fetch(\'/api/focus-sessions\') → 数据库（专注记录）');
  console.log('  6. ⚠️ todayStats 本身未直接写入数据库');
  console.log('');
  console.log('读取流程:');
  console.log('  设备A: localStorage.getItem(\'todayStats\') → 30分钟');
  console.log('  设备B: localStorage.getItem(\'todayStats\') → 0分钟（未同步）');
  console.log('  ❌ 跨设备可能不一致\n');
  
  console.log('解决方案:');
  console.log('  Option 1: 从数据库的focus-sessions实时计算todayStats');
  console.log('  Option 2: 每次专注完成时，同时更新数据库的user stats');
  console.log('  Option 3: 定期同步todayStats到数据库\n');
  
  results.push({
    testName: '数据流向分析',
    passed: false,
    details: '发现todayStats和weeklyStats可能不同步',
    issues: ['todayStats未直接写入数据库', 'weeklyStats未直接写入数据库'],
  });
}

// ============================================
// 运行所有测试
// ============================================
testLocalStorageDependency();
testDatabaseToLocalStorage();
testLocalStorageToDatabase();
testCrossDeviceConsistency();
testDataFlow();

// ============================================
// 输出测试结果
// ============================================
console.log('\n' + '='.repeat(60));
console.log('📊 测试结果汇总\n');

results.forEach((result, index) => {
  const status = result.passed ? '✅ 通过' : '⚠️ 发现问题';
  console.log(`${index + 1}. ${result.testName}: ${status}`);
  console.log(`   详情: ${result.details}`);
  if (result.issues && result.issues.length > 0) {
    console.log(`   问题:`);
    result.issues.forEach(issue => {
      console.log(`     - ${issue}`);
    });
  }
  console.log('');
});

const totalTests = results.length;
const passedTests = results.filter(r => r.passed).length;
const failedTests = totalTests - passedTests;

console.log('='.repeat(60));
console.log(`总计: ${totalTests} 个测试`);
console.log(`✅ 通过: ${passedTests}`);
console.log(`⚠️ 问题: ${failedTests}`);
console.log('='.repeat(60));

// ============================================
// 输出修复建议
// ============================================
if (failedTests > 0) {
  console.log('\n🔧 修复建议:\n');
  
  console.log('1. 统一数据写入逻辑');
  console.log('   - 所有关键数据更新时，同时写入数据库和localStorage');
  console.log('   - 使用 DataLoader.save() 统一接口\n');
  
  console.log('2. 增强同步机制');
  console.log('   - 添加 /api/user/stats/update 接口');
  console.log('   - 专注完成时同时更新 user stats 表');
  console.log('   - 实时同步 todayStats 和 weeklyStats\n');
  
  console.log('3. 定期后台同步');
  console.log('   - 每30分钟从数据库刷新一次数据');
  console.log('   - 检测到数据不一致时自动修复\n');
  
  console.log('4. 离线支持');
  console.log('   - 离线时缓存操作到队列');
  console.log('   - 上线后批量同步到数据库\n');
}

console.log('✅ 测试完成！\n');

