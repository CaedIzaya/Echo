/**
 * 用户数据隔离测试脚本
 * 测试localStorage是否按账号正确隔离
 */

console.log('🧪 用户数据隔离测试\n');
console.log('='.repeat(60));

// 检查当前用户ID
const currentUserId = sessionStorage.getItem('currentUserId');
console.log('当前用户ID:', currentUserId || '❌ 未设置');

if (!currentUserId) {
  console.log('\n⚠️ 警告：未设置用户ID！');
  console.log('这意味着localStorage可能没有按账号隔离。');
  console.log('\n解决方案：');
  console.log('1. 确保登录时调用了 setCurrentUserId(session.user.id)');
  console.log('2. 检查 src/pages/auth/signin.tsx');
  console.log('3. 检查 src/pages/index.tsx\n');
} else {
  console.log('✅ 用户ID已设置\n');
  
  // 检查用户隔离的localStorage key
  console.log('检查用户隔离的数据...\n');
  
  const userPrefix = `user_${currentUserId}_`;
  const userKeys = [];
  const globalKeys = [];
  
  // 关键数据key列表
  const criticalKeys = [
    'userPlans',
    'todayStats',
    'weeklyStats',
    'userExp',
    'heartTreeExp',
    'heartTreeName',
    'achievedAchievements',
    'focusSession',
  ];
  
  // 检查每个key
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    // 检查是否是用户隔离的key
    if (key.startsWith(userPrefix)) {
      userKeys.push(key);
    }
    
    // 检查关键数据是否使用了全局key（应该避免）
    criticalKeys.forEach(criticalKey => {
      if (key === criticalKey) {
        globalKeys.push(key);
      }
    });
  }
  
  console.log(`✅ 找到 ${userKeys.length} 个用户隔离的数据项:`);
  if (userKeys.length > 0) {
    userKeys.slice(0, 10).forEach(key => {
      const shortKey = key.replace(userPrefix, '');
      const value = localStorage.getItem(key);
      let displayValue = value;
      if (value && value.length > 50) {
        displayValue = value.substring(0, 50) + '...';
      }
      console.log(`  - ${shortKey}: ${displayValue}`);
    });
    if (userKeys.length > 10) {
      console.log(`  ... 还有 ${userKeys.length - 10} 个`);
    }
  } else {
    console.log('  (无)');
  }
  
  console.log(`\n⚠️ 找到 ${globalKeys.length} 个使用全局key的关键数据:`);
  if (globalKeys.length > 0) {
    globalKeys.forEach(key => {
      console.log(`  - ${key} (应该使用 user_${currentUserId}_${key})`);
    });
    console.log('\n❌ 问题：这些数据使用了全局key，会导致多账号数据冲突！');
    console.log('\n解决方案：');
    console.log('1. 使用 userStorageJSON.set() 而不是 localStorage.setItem()');
    console.log('2. 使用 userStorageJSON.get() 而不是 localStorage.getItem()');
    console.log('3. 检查 src/lib/userStorage.ts 是否被正确使用\n');
  } else {
    console.log('  (无)');
    console.log('\n✅ 所有关键数据都使用了用户隔离存储！');
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n测试场景：多账号切换\n');
console.log('1. 账号A登录 → 创建计划"学习编程"');
console.log('2. 账号A退出');
console.log('3. 账号B登录');
console.log('4. 检查账号B是否能看到"学习编程"');
console.log('\n预期结果：');
console.log('✅ 账号B看不到账号A的计划（数据隔离成功）');
console.log('❌ 账号B能看到账号A的计划（数据隔离失败）\n');

console.log('='.repeat(60));
console.log('✅ 测试完成！\n');


