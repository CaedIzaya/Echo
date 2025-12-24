/**
 * 紧急经验值恢复脚本
 * 
 * 使用方法：
 * 1. 打开浏览器控制台（按 F12）
 * 2. 切换到 Console 标签
 * 3. 复制粘贴下面的代码并按回车
 * 4. 按照提示输入你的正确经验值
 */

(async function emergencyExpRecovery() {
  console.log('🚨 紧急经验值恢复工具');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 检查当前状态
  const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
  console.log('📊 当前经验值:', currentExp);
  
  // 计算当前等级
  function calculateLevel(exp) {
    let totalExp = exp;
    let currentLevel = 1;
    let currentExp = 0;
    
    const getLevelExp = (level) => {
      if (level <= 10) return 100;
      if (level <= 20) return 200;
      if (level <= 30) return 300;
      if (level <= 40) return 400;
      if (level <= 50) return 500;
      if (level <= 60) return 600;
      return 1000;
    };
    
    let expNeeded = getLevelExp(1);
    while (totalExp >= expNeeded && currentLevel < 99) {
      totalExp -= expNeeded;
      currentLevel++;
      expNeeded = getLevelExp(currentLevel);
    }
    currentExp = Math.floor(totalExp);
    
    return {
      currentLevel,
      currentExp,
      nextLevelExp: getLevelExp(currentLevel),
      totalExp: exp
    };
  }
  
  const currentLevelInfo = calculateLevel(currentExp);
  console.log('📊 当前等级:', `Level ${currentLevelInfo.currentLevel} (${currentLevelInfo.currentExp}/${currentLevelInfo.nextLevelExp})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 提示输入正确的经验值
  console.log('');
  console.log('💡 请按照以下步骤操作：');
  console.log('');
  console.log('1️⃣ 想想你昨天的经验值是多少？');
  console.log('   例如：如果你记得是 Level 11，大约有 1001-1199 经验值');
  console.log('');
  console.log('2️⃣ 运行以下命令恢复经验值（修改数字为你的经验值）：');
  console.log('');
  console.log('   recoveryExp(1001);  // 👈 修改这个数字！');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📌 等级对照表（帮助你回忆）：');
  console.log('');
  console.log('   Level 1-10  : 0-999 经验');
  console.log('   Level 11    : 1000-1199 经验  ← 1001经验在这里！');
  console.log('   Level 12    : 1200-1399 经验');
  console.log('   Level 13    : 1400-1599 经验');
  console.log('   Level 14    : 1600-1799 经验');
  console.log('   Level 15    : 1800-1999 经验');
  console.log('   ...');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 定义恢复函数
  window.recoveryExp = async function(correctExp) {
    console.log('');
    console.log('🔧 开始恢复经验值...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 验证输入
    if (typeof correctExp !== 'number' || correctExp < 0) {
      console.error('❌ 错误：请输入有效的经验值数字！');
      console.log('');
      console.log('示例：recoveryExp(1001);');
      return;
    }
    
    if (correctExp > 100000) {
      console.error('❌ 错误：经验值过大，请确认！');
      return;
    }
    
    const newLevelInfo = calculateLevel(correctExp);
    console.log('📊 恢复后等级:', `Level ${newLevelInfo.currentLevel} (${newLevelInfo.currentExp}/${newLevelInfo.nextLevelExp})`);
    console.log('');
    
    // 确认
    const confirmed = confirm(`确认要将经验值恢复到 ${correctExp} 吗？\n这将设置你为 Level ${newLevelInfo.currentLevel}`);
    
    if (!confirmed) {
      console.log('❌ 取消恢复');
      return;
    }
    
    console.log('💾 正在保存到 localStorage...');
    
    // 保存到 localStorage
    localStorage.setItem('userExp', correctExp.toString());
    localStorage.setItem('userExpSynced', 'false'); // 标记为未同步，强制下次从localStorage读取
    
    console.log('✅ localStorage 已更新');
    console.log('');
    console.log('🌐 正在同步到数据库...');
    
    try {
      // 同步到数据库
      const response = await fetch('/api/user/exp/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userExp: correctExp })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 数据库同步成功！');
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('🎉 恢复完成！');
        console.log('');
        console.log('📊 新状态：');
        console.log(`   经验值: ${correctExp}`);
        console.log(`   等级: Level ${newLevelInfo.currentLevel}`);
        console.log(`   进度: ${newLevelInfo.currentExp}/${newLevelInfo.nextLevelExp}`);
        console.log('');
        console.log('🔄 即将刷新页面...');
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // 3秒后刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        const error = await response.json();
        console.error('❌ 数据库同步失败:', error);
        console.log('');
        console.log('⚠️ 但 localStorage 已保存，请稍后刷新页面');
      }
    } catch (err) {
      console.error('❌ 网络错误:', err);
      console.log('');
      console.log('⚠️ 但 localStorage 已保存，请稍后刷新页面');
    }
  };
  
  console.log('✅ 恢复工具已准备就绪！');
  console.log('');
  console.log('💡 现在输入：recoveryExp(你的经验值);');
  console.log('');
})();





