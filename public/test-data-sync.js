/**
 * 数据同步测试脚本（浏览器控制台版本）
 * 
 * 使用方法：
 * 1. 登录到 Echo 应用
 * 2. 打开浏览器控制台（F12）
 * 3. 复制粘贴此脚本并运行
 * 4. 查看测试结果
 */

(async function testDataSync() {
  console.log('%c🧪 Echo 数据同步测试', 'font-size: 20px; font-weight: bold; color: #14b8a6;');
  console.log('测试时间:', new Date().toLocaleString('zh-CN'));
  console.log('─'.repeat(60));
  
  const results = [];
  
  // ============================================
  // 测试1: 检查localStorage数据
  // ============================================
  console.log('\n%c📋 测试1: 检查localStorage数据', 'font-size: 16px; font-weight: bold; color: #0ea5e9;');
  
  const localStorageKeys = [
    'userExp',
    'heartTreeExp',
    'heartTreeNameV1',
    'todayStats',
    'weeklyStats',
    'totalFocusMinutes',
    'achievedAchievements',
    'userPlans',
    'dashboardStats',
  ];
  
  const localData = {};
  localStorageKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        localData[key] = JSON.parse(value);
      } catch {
        localData[key] = value;
      }
      console.log(`  ✅ ${key}:`, localData[key]);
    } else {
      console.log(`  ❌ ${key}: 未找到`);
    }
  });
  
  results.push({
    test: 'localStorage数据检查',
    passed: Object.keys(localData).length >= 5,
    details: `找到 ${Object.keys(localData).length}/${localStorageKeys.length} 项数据`
  });
  
  // ============================================
  // 测试2: 检查数据库数据
  // ============================================
  console.log('\n%c📋 测试2: 检查数据库数据', 'font-size: 16px; font-weight: bold; color: #0ea5e9;');
  
  try {
    // 获取用户经验值
    const expRes = await fetch('/api/user/exp');
    const expData = await expRes.json();
    console.log('  ✅ 用户经验值:', expData.exp);
    
    // 获取心树数据
    const treeExpRes = await fetch('/api/heart-tree/exp');
    const treeExpData = await treeExpRes.json();
    console.log('  ✅ 心树经验值:', treeExpData.exp);
    
    // 获取统计数据
    const statsRes = await fetch('/api/dashboard/stats');
    const statsData = await statsRes.json();
    console.log('  ✅ 今日专注:', statsData.todayMinutes, '分钟');
    console.log('  ✅ 本周专注:', statsData.weeklyMinutes, '分钟');
    console.log('  ✅ 累计专注:', statsData.totalMinutes, '分钟');
    console.log('  ✅ 连续天数:', statsData.streakDays, '天');
    
    // 获取计划数据
    const projectsRes = await fetch('/api/projects');
    const projectsData = await projectsRes.json();
    console.log('  ✅ 用户计划:', projectsData.projects.length, '个');
    
    results.push({
      test: '数据库数据检查',
      passed: true,
      details: '所有API正常响应'
    });
    
    // ============================================
    // 测试3: 数据一致性对比
    // ============================================
    console.log('\n%c📋 测试3: 数据一致性对比', 'font-size: 16px; font-weight: bold; color: #0ea5e9;');
    
    const inconsistencies = [];
    
    // 对比用户经验值
    const localUserExp = parseInt(localData.userExp || '0');
    const dbUserExp = expData.exp || 0;
    if (localUserExp !== dbUserExp) {
      inconsistencies.push(`用户经验值不一致: localStorage=${localUserExp}, 数据库=${dbUserExp}`);
      console.log('  ⚠️ 用户经验值不一致:', { localStorage: localUserExp, 数据库: dbUserExp });
    } else {
      console.log('  ✅ 用户经验值一致:', localUserExp);
    }
    
    // 对比今日统计
    const today = new Date().toISOString().split('T')[0];
    const localTodayMinutes = localData.todayStats?.[today]?.minutes || 0;
    const dbTodayMinutes = statsData.todayMinutes || 0;
    if (localTodayMinutes !== dbTodayMinutes) {
      inconsistencies.push(`今日统计不一致: localStorage=${localTodayMinutes}, 数据库=${dbTodayMinutes}`);
      console.log('  ⚠️ 今日统计不一致:', { localStorage: localTodayMinutes, 数据库: dbTodayMinutes });
    } else {
      console.log('  ✅ 今日统计一致:', localTodayMinutes, '分钟');
    }
    
    // 对比本周统计
    const localWeeklyMinutes = localData.weeklyStats?.totalMinutes || 0;
    const dbWeeklyMinutes = statsData.weeklyMinutes || 0;
    if (localWeeklyMinutes !== dbWeeklyMinutes) {
      inconsistencies.push(`本周统计不一致: localStorage=${localWeeklyMinutes}, 数据库=${dbWeeklyMinutes}`);
      console.log('  ⚠️ 本周统计不一致:', { localStorage: localWeeklyMinutes, 数据库: dbWeeklyMinutes });
    } else {
      console.log('  ✅ 本周统计一致:', localWeeklyMinutes, '分钟');
    }
    
    // 对比计划数量
    const localPlansCount = localData.userPlans?.length || 0;
    const dbPlansCount = projectsData.projects.length || 0;
    if (localPlansCount !== dbPlansCount) {
      inconsistencies.push(`计划数量不一致: localStorage=${localPlansCount}, 数据库=${dbPlansCount}`);
      console.log('  ⚠️ 计划数量不一致:', { localStorage: localPlansCount, 数据库: dbPlansCount });
    } else {
      console.log('  ✅ 计划数量一致:', localPlansCount, '个');
    }
    
    results.push({
      test: '数据一致性对比',
      passed: inconsistencies.length === 0,
      details: inconsistencies.length === 0 ? '所有数据一致' : `发现 ${inconsistencies.length} 处不一致`,
      issues: inconsistencies
    });
    
    if (inconsistencies.length > 0) {
      console.log('\n%c⚠️ 发现数据不一致', 'color: #f59e0b; font-weight: bold;');
      inconsistencies.forEach(issue => {
        console.log('  -', issue);
      });
      console.log('\n💡 建议: 刷新页面以从数据库重新加载数据');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    results.push({
      test: '数据库数据检查',
      passed: false,
      details: error.message
    });
  }
  
  // ============================================
  // 测试4: 用户隔离检查
  // ============================================
  console.log('\n%c📋 测试4: 用户隔离检查', 'font-size: 16px; font-weight: bold; color: #0ea5e9;');
  
  const currentUserId = sessionStorage.getItem('currentUserId');
  if (currentUserId) {
    console.log('  ✅ 当前用户ID:', currentUserId);
    
    // 检查是否有用户隔离的key
    const userKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`user_${currentUserId}_`)) {
        userKeys.push(key);
      }
    }
    
    if (userKeys.length > 0) {
      console.log('  ✅ 用户隔离存储已启用');
      console.log('  ✅ 找到', userKeys.length, '个用户隔离的数据项');
      userKeys.slice(0, 5).forEach(key => {
        console.log('    -', key);
      });
      if (userKeys.length > 5) {
        console.log('    - ... 还有', userKeys.length - 5, '个');
      }
    } else {
      console.log('  ⚠️ 未找到用户隔离的数据项（可能使用全局存储）');
    }
    
    results.push({
      test: '用户隔离检查',
      passed: userKeys.length > 0,
      details: `找到 ${userKeys.length} 个用户隔离数据项`
    });
  } else {
    console.log('  ⚠️ 未找到当前用户ID');
    results.push({
      test: '用户隔离检查',
      passed: false,
      details: '未设置用户ID'
    });
  }
  
  // ============================================
  // 输出测试结果
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('%c📊 测试结果汇总', 'font-size: 18px; font-weight: bold; color: #14b8a6;');
  console.log('='.repeat(60));
  
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '⚠️';
    const color = result.passed ? '#10b981' : '#f59e0b';
    console.log(`\n${index + 1}. ${icon} ${result.test}`);
    console.log(`   详情: ${result.details}`);
    if (result.issues && result.issues.length > 0) {
      console.log('   问题:');
      result.issues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }
  });
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  console.log('\n' + '='.repeat(60));
  console.log(`总计: ${totalTests} 个测试`);
  console.log(`%c✅ 通过: ${passedTests}`, 'color: #10b981; font-weight: bold;');
  if (failedTests > 0) {
    console.log(`%c⚠️ 问题: ${failedTests}`, 'color: #f59e0b; font-weight: bold;');
  }
  console.log('='.repeat(60));
  
  // ============================================
  // 提供修复建议
  // ============================================
  if (failedTests > 0) {
    console.log('\n%c🔧 修复建议', 'font-size: 16px; font-weight: bold; color: #f59e0b;');
    console.log('\n1. 刷新页面以从数据库重新加载数据');
    console.log('2. 如果问题持续，清除localStorage并重新登录');
    console.log('3. 检查网络连接是否正常');
  } else {
    console.log('\n%c🎉 所有测试通过！数据同步机制运行正常！', 'font-size: 16px; font-weight: bold; color: #10b981;');
  }
  
  console.log('\n✅ 测试完成！\n');
  
  return results;
})();

