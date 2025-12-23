/**
 * 完整数据迁移脚本
 * 
 * 功能：将 localStorage 的所有数据迁移到数据库
 * 使用：在浏览器控制台运行（需要已登录）
 * 
 * 迁移内容：
 * 1. 用户计划 (userPlans) → Project 表
 * 2. 心流指标 (flowMetrics) → User.flowMetrics
 * 3. 验证其他已迁移的数据
 */

(async function migrateAllData() {
  console.log('🚀 开始完整数据迁移...\n');
  
  const results = {
    success: [],
    failed: [],
    skipped: [],
  };

  // ============================================
  // 1. 迁移用户计划 (userPlans)
  // ============================================
  console.log('📋 步骤1: 迁移用户计划...');
  
  const userPlans = localStorage.getItem('userPlans');
  if (userPlans) {
    try {
      const plans = JSON.parse(userPlans);
      console.log(`  找到 ${plans.length} 个计划`);
      
      if (plans.length > 0) {
        // 调用迁移API
        const response = await fetch('/api/projects/migrate-from-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plans })
        });
        
        const data = await response.json();
        
        if (data.success) {
          results.success.push(`✅ 用户计划: 迁移 ${data.migratedCount}/${data.total} 个计划`);
          console.log(`  ✅ 迁移成功: ${data.migratedCount}/${data.total}`);
          
          if (data.errors && data.errors.length > 0) {
            console.warn('  ⚠️  部分失败:', data.errors);
            results.failed.push(`⚠️  用户计划: ${data.errors.length} 个失败`);
          }
        } else {
          throw new Error(data.message || '迁移失败');
        }
      } else {
        results.skipped.push('⏭️  用户计划: 无数据需要迁移');
        console.log('  ⏭️  无计划需要迁移');
      }
    } catch (error) {
      results.failed.push(`❌ 用户计划: ${error.message}`);
      console.error('  ❌ 迁移失败:', error);
    }
  } else {
    results.skipped.push('⏭️  用户计划: localStorage 中无数据');
    console.log('  ⏭️  localStorage 中无计划数据');
  }

  // ============================================
  // 2. 迁移心流指标 (flowMetrics)
  // ============================================
  console.log('\n📊 步骤2: 迁移心流指标...');
  
  const flowMetrics = localStorage.getItem('flowMetrics');
  if (flowMetrics) {
    try {
      const metrics = JSON.parse(flowMetrics);
      console.log('  找到心流指标数据');
      
      const response = await fetch('/api/user/flow-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowMetrics: metrics })
      });
      
      if (response.ok) {
        results.success.push('✅ 心流指标: 迁移成功');
        console.log('  ✅ 迁移成功');
      } else {
        throw new Error('API 返回错误');
      }
    } catch (error) {
      results.failed.push(`❌ 心流指标: ${error.message}`);
      console.error('  ❌ 迁移失败:', error);
    }
  } else {
    results.skipped.push('⏭️  心流指标: localStorage 中无数据');
    console.log('  ⏭️  localStorage 中无数据');
  }

  // ============================================
  // 3. 验证已迁移的数据
  // ============================================
  console.log('\n🔍 步骤3: 验证已迁移的数据...');
  
  const checks = [
    { key: 'userExp', name: '用户经验' },
    { key: 'achievedAchievements', name: '成就记录' },
    { key: 'heartTreeNameV1', name: '心树名字' },
  ];
  
  for (const check of checks) {
    const value = localStorage.getItem(check.key);
    if (value) {
      console.log(`  ✅ ${check.name}: 已存在`);
    } else {
      console.log(`  ⚠️  ${check.name}: localStorage 中无数据`);
    }
  }

  // ============================================
  // 4. 同步所有数据（确保一致性）
  // ============================================
  console.log('\n🔄 步骤4: 同步所有数据...');
  
  try {
    const response = await fetch('/api/user/sync-all-data');
    const data = await response.json();
    
    console.log('  ✅ 同步成功');
    console.log('  📊 数据摘要:', {
      经验值: data.userExp,
      等级: data.userLevel,
      成就: data.achievements.length + '个',
      今日专注: data.todayStats.minutes + '分钟',
      累计专注: data.totalStats.totalMinutes + '分钟',
    });
    
    results.success.push('✅ 数据同步: 完成');
    
  } catch (error) {
    results.failed.push(`❌ 数据同步: ${error.message}`);
    console.error('  ❌ 同步失败:', error);
  }

  // ============================================
  // 5. 生成迁移报告
  // ============================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 迁移报告');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (results.success.length > 0) {
    console.log('\n✅ 成功项:');
    results.success.forEach(msg => console.log('  ' + msg));
  }
  
  if (results.skipped.length > 0) {
    console.log('\n⏭️  跳过项:');
    results.skipped.forEach(msg => console.log('  ' + msg));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ 失败项:');
    results.failed.forEach(msg => console.log('  ' + msg));
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const totalItems = results.success.length + results.failed.length + results.skipped.length;
  const successRate = totalItems > 0 
    ? ((results.success.length / totalItems) * 100).toFixed(1)
    : 0;
  
  console.log(`📈 成功率: ${successRate}% (${results.success.length}/${totalItems})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (results.failed.length === 0) {
    console.log('🎉 迁移完成！');
    console.log('\n💡 下一步:');
    console.log('  1. 刷新页面验证数据');
    console.log('  2. 检查计划和里程碑是否完整');
    console.log('  3. 可以继续正常使用系统');
    console.log('\n⚠️  注意: 迁移成功后，建议备份 localStorage 数据，然后可以考虑清除旧数据');
  } else {
    console.log('⚠️  迁移部分失败');
    console.log('\n💡 建议:');
    console.log('  1. 检查网络连接');
    console.log('  2. 重新运行迁移脚本');
    console.log('  3. 如果持续失败，请联系技术支持');
  }
  
  return {
    success: results.failed.length === 0,
    stats: {
      success: results.success.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      total: totalItems,
      successRate: successRate + '%'
    },
    details: results
  };
})();








