/**
 * 周报历史功能 - 快速测试工具
 * 
 * 使用方法：
 * 1. 打开周报页面 /reports/weekly
 * 2. 按 F12 打开控制台
 * 3. 复制粘贴此文件全部内容并回车
 * 4. 运行测试命令
 */

(function() {
  console.log('📊 周报历史功能测试工具');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // ========== 工具函数 ==========
  
  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekRange = (referenceDate = new Date()) => {
    const ref = new Date(referenceDate);
    ref.setHours(0, 0, 0, 0);
    const day = ref.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(ref);
    start.setDate(ref.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  // ========== 测试函数 ==========

  window.testWeeklyHistory = async function() {
    console.log('');
    console.log('🧪 开始完整测试');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 测试 1：API 可用性
    console.log('');
    console.log('1️⃣ 测试历史列表 API');
    console.log('─────────────────────────────────────────');
    try {
      const response = await fetch('/api/weekly-reports/history');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API 正常');
        console.log('   状态码:', response.status);
        console.log('   历史周报数量:', data.total);
        
        if (data.history && data.history.length > 0) {
          console.log('   最新周报:', data.history[0].label);
          console.log('   最早周报:', data.history[data.history.length - 1].label);
          console.log('');
          console.log('   详细列表:');
          data.history.forEach((week, i) => {
            console.log(`   ${i + 1}. ${week.label}`);
            console.log(`      时长: ${week.totalHours} 小时`);
            console.log(`      连续: ${week.streakDays} 天`);
            console.log(`      心流: ${week.flowAvg || 'N/A'}`);
          });
        } else {
          console.log('   ℹ️ 暂无历史周报数据');
        }
      } else {
        console.error('❌ API 失败');
        console.error('   状态码:', response.status);
        const error = await response.json();
        console.error('   错误:', error);
      }
    } catch (error) {
      console.error('❌ API 请求异常:', error);
    }

    // 测试 2：当前页面状态
    console.log('');
    console.log('2️⃣ 测试当前页面状态');
    console.log('─────────────────────────────────────────');
    const url = new URL(window.location.href);
    const weekStart = url.searchParams.get('weekStart');
    
    console.log('   当前URL:', window.location.href);
    console.log('   weekStart参数:', weekStart || '无（默认本周）');
    
    // 计算本周
    const { start: currentWeekStart } = getWeekRange(new Date());
    const currentWeekStartStr = formatDateKey(currentWeekStart);
    console.log('   本周周一:', currentWeekStartStr);
    console.log('   是否本周:', !weekStart || weekStart === currentWeekStartStr ? '是' : '否');

    // 测试 3：导航按钮
    console.log('');
    console.log('3️⃣ 测试导航按钮');
    console.log('─────────────────────────────────────────');
    
    // 查找按钮（使用更可靠的方法）
    const buttons = Array.from(document.querySelectorAll('button'));
    const prevBtn = buttons.find(btn => btn.textContent.includes('上一周'));
    const nextBtn = buttons.find(btn => btn.textContent.includes('下一周'));
    const currentBtn = buttons.find(btn => btn.textContent.includes('本周') && !btn.textContent.includes('上一周') && !btn.textContent.includes('下一周'));
    
    console.log('   上一周按钮:', prevBtn ? (prevBtn.disabled ? '❌ 禁用' : '✅ 可用') : '⚠️ 未找到');
    console.log('   下一周按钮:', nextBtn ? (nextBtn.disabled ? '❌ 禁用' : '✅ 可用') : '⚠️ 未找到');
    console.log('   本周按钮:', currentBtn ? '✅ 显示' : 'ℹ️ 隐藏（当前是本周）');

    // 测试 4：历史列表
    console.log('');
    console.log('4️⃣ 测试历史列表');
    console.log('─────────────────────────────────────────');
    const historyBtn = buttons.find(btn => btn.textContent.includes('查看历史周报'));
    console.log('   历史按钮:', historyBtn ? '✅ 存在' : '⚠️ 未找到');
    
    if (historyBtn) {
      const match = historyBtn.textContent.match(/(\d+)\s*周/);
      if (match) {
        console.log('   显示周数:', match[1], '周');
      }
    }

    // 测试 5：当前周标识
    console.log('');
    console.log('5️⃣ 测试当前周标识');
    console.log('─────────────────────────────────────────');
    const currentBadge = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent.includes('当前周报') || el.textContent.includes('⭐')
    );
    console.log('   当前周徽章:', currentBadge ? '✅ 显示' : 'ℹ️ 未显示（可能不是本周）');

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 测试完成！');
    console.log('');
  };

  window.testNavigation = function() {
    console.log('');
    console.log('🧭 导航功能测试');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const { start: currentWeekStart } = getWeekRange(new Date());
    const currentWeekStartStr = formatDateKey(currentWeekStart);
    
    console.log('');
    console.log('📅 周期计算:');
    console.log('   本周周一:', currentWeekStartStr);
    
    // 计算4周历史
    for (let i = 0; i <= 4; i++) {
      const weekDate = new Date(currentWeekStart);
      weekDate.setDate(currentWeekStart.getDate() - (i * 7));
      const weekStartStr = formatDateKey(weekDate);
      const weekEndDate = new Date(weekDate);
      weekEndDate.setDate(weekDate.getDate() + 6);
      const weekEndStr = formatDateKey(weekEndDate);
      
      console.log(`   ${i === 0 ? '本周' : `${i}周前`}: ${weekStartStr} 至 ${weekEndStr}`);
    }
    
    console.log('');
    console.log('🔗 快速导航链接:');
    for (let i = 0; i <= 4; i++) {
      const weekDate = new Date(currentWeekStart);
      weekDate.setDate(currentWeekStart.getDate() - (i * 7));
      const weekStartStr = formatDateKey(weekDate);
      const url = i === 0 
        ? '/reports/weekly' 
        : `/reports/weekly?weekStart=${weekStartStr}`;
      console.log(`   ${i === 0 ? '本周' : `${i}周前`}: ${url}`);
    }
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };

  window.goToWeek = function(weeksAgo = 0) {
    const { start: currentWeekStart } = getWeekRange(new Date());
    const targetDate = new Date(currentWeekStart);
    targetDate.setDate(currentWeekStart.getDate() - (weeksAgo * 7));
    const weekStartStr = formatDateKey(targetDate);
    
    const url = weeksAgo === 0 
      ? '/reports/weekly' 
      : `/reports/weekly?weekStart=${weekStartStr}`;
    
    console.log(`🔗 跳转到${weeksAgo === 0 ? '本周' : `${weeksAgo}周前`}: ${url}`);
    window.location.href = url;
  };

  window.testMailInbox = async function() {
    console.log('');
    console.log('📧 测试邮件系统集成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('');
    console.log('ℹ️ 请手动检查:');
    console.log('   1. 打开 Dashboard');
    console.log('   2. 点击信箱图标 📧');
    console.log('   3. 查看是否有"查看周报历史"入口');
    console.log('   4. 点击应该跳转到 /reports/weekly');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };

  // ========== 使用说明 ==========

  console.log('');
  console.log('📌 可用的测试命令：');
  console.log('');
  console.log('1️⃣ testWeeklyHistory()');
  console.log('   完整测试所有功能（推荐）');
  console.log('');
  console.log('2️⃣ testNavigation()');
  console.log('   测试导航链接和周期计算');
  console.log('');
  console.log('3️⃣ goToWeek(n)');
  console.log('   跳转到 n 周前的周报');
  console.log('   例如: goToWeek(0) - 本周');
  console.log('        goToWeek(1) - 上周');
  console.log('        goToWeek(2) - 2周前');
  console.log('');
  console.log('4️⃣ testMailInbox()');
  console.log('   测试邮件系统集成（需手动检查）');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('💡 建议执行顺序：');
  console.log('');
  console.log('步骤 1：testWeeklyHistory()  // 完整测试');
  console.log('步骤 2：testNavigation()     // 查看导航链接');
  console.log('步骤 3：goToWeek(1)          // 测试跳转到上周');
  console.log('步骤 4：testWeeklyHistory()  // 再次测试（应该在上周）');
  console.log('步骤 5：goToWeek(0)          // 返回本周');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('✅ 工具已加载！现在运行 testWeeklyHistory() 开始测试。');
  console.log('');
})();






