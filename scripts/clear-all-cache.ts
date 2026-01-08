/**
 * 清理所有localStorage缓存
 * 用于调试和测试
 */

console.log('🧹 开始清理localStorage缓存...');

if (typeof window !== 'undefined') {
  const keysToRemove = [
    'userPlans',
    'userPlansSynced',
    'projectsSyncedAt',
    'primaryPlanChanged',
  ];

  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`✅ 已清除: ${key}`);
    }
  });

  console.log('🎉 清理完成！刷新页面即可。');
} else {
  console.log('❌ 请在浏览器控制台运行此脚本');
}

