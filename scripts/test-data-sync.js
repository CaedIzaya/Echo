/**
 * 数据同步测试脚本
 * 
 * 使用方法：在浏览器控制台粘贴并运行
 * 或者在页面中直接运行（已登录状态）
 */

(async function testDataSync() {
  console.log('🔍 开始测试数据同步系统...\n');
  
  // 1. 检查当前 localStorage 数据
  console.log('📦 当前 localStorage 数据:');
  const localData = {
    userExp: localStorage.getItem('userExp'),
    achievements: JSON.parse(localStorage.getItem('achievedAchievements') || '[]'),
    totalMinutes: localStorage.getItem('totalFocusMinutes'),
    lastSync: localStorage.getItem('dataSyncedAt'),
  };
  console.table(localData);
  
  // 2. 调用同步 API
  console.log('\n📡 正在从数据库同步数据...');
  
  try {
    const response = await fetch('/api/user/sync-all-data');
    
    if (!response.ok) {
      throw new Error(`API 返回错误: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 3. 显示数据库数据
    console.log('\n💾 数据库中的数据:');
    console.table({
      用户ID: data.userId,
      邮箱: data.email,
      经验值: data.userExp,
      等级: data.userLevel,
      成就数: data.achievements.length,
      累计专注: `${data.totalStats.totalMinutes} 分钟`,
      总专注次数: data.totalStats.totalSessions,
      今日专注: `${data.todayStats.minutes} 分钟`,
      本周专注: `${data.weeklyStats.totalMinutes} 分钟`,
    });
    
    // 4. 对比差异
    console.log('\n🔍 数据对比:');
    const localExp = parseFloat(localStorage.getItem('userExp') || '0');
    const localAchievements = JSON.parse(localStorage.getItem('achievedAchievements') || '[]');
    const localMinutes = parseFloat(localStorage.getItem('totalFocusMinutes') || '0');
    
    console.table({
      '经验值': {
        '本地': localExp,
        '数据库': data.userExp,
        '差异': data.userExp - localExp,
        '状态': localExp === data.userExp ? '✅ 一致' : '⚠️ 不一致'
      },
      '成就数': {
        '本地': localAchievements.length,
        '数据库': data.achievements.length,
        '差异': data.achievements.length - localAchievements.length,
        '状态': localAchievements.length === data.achievements.length ? '✅ 一致' : '⚠️ 不一致'
      },
      '专注时长': {
        '本地': localMinutes,
        '数据库': data.totalStats.totalMinutes,
        '差异': data.totalStats.totalMinutes - localMinutes,
        '状态': Math.abs(localMinutes - data.totalStats.totalMinutes) < 5 ? '✅ 一致' : '⚠️ 不一致'
      }
    });
    
    // 5. 显示成就详情
    console.log('\n🏆 已解锁成就列表:');
    data.achievementDetails.forEach((ach, index) => {
      console.log(`  ${index + 1}. ${ach.achievementId} (${ach.category}) - ${ach.unlockedAt.split('T')[0]}`);
    });
    
    // 6. 新用户判定结果
    console.log('\n🎯 新用户判定:');
    console.table({
      '判定结果': data.isReallyNewUser ? '❌ 新用户' : '✅ 老用户',
      '账号类型': data.isOldAccount ? '老账号（>24h）' : '新账号（<24h）',
      '有数据': data.hasAnyData ? '✅ 是' : '❌ 否',
      '同步时间': data.syncedAt,
    });
    
    // 7. 建议
    console.log('\n💡 建议:');
    if (data.isReallyNewUser) {
      console.log('  ✅ 这是一个新用户，数据为0是正常的');
    } else if (!data.hasAnyData && data.isOldAccount) {
      console.warn('  ⚠️  警告：老账号但无数据，可能数据丢失！');
      console.log('  → 建议检查数据库中是否有专注记录');
      console.log('  → 运行: npx tsx scripts/check-data-integrity.ts <email>');
    } else if (localExp < data.userExp || localAchievements.length < data.achievements.length) {
      console.warn('  ⚠️  本地数据落后于数据库，需要同步');
      console.log('  → 运行下面的代码更新 localStorage:');
      console.log(`
        localStorage.setItem('userExp', '${data.userExp}');
        localStorage.setItem('achievedAchievements', '${JSON.stringify(data.achievements)}');
        localStorage.setItem('totalFocusMinutes', '${data.totalStats.totalMinutes}');
        localStorage.setItem('dataSyncedAt', '${data.syncedAt}');
        location.reload();
      `);
    } else {
      console.log('  ✅ 数据一致，系统正常');
    }
    
    console.log('\n✅ 测试完成！');
    return data;
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.log('\n可能的原因:');
    console.log('  1. 未登录（请先登录）');
    console.log('  2. 网络问题');
    console.log('  3. 服务器错误');
    return null;
  }
})();







