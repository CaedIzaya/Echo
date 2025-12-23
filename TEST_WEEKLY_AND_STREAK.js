/**
 * 周报邮件和连续天数 - 快速测试工具
 * 
 * 使用方法：
 * 1. 打开 Dashboard 页面
 * 2. 按 F12 打开浏览器控制台
 * 3. 复制粘贴此文件的全部内容并按回车
 * 4. 按照提示选择测试项目
 */

(function() {
  console.log('🧪 周报邮件和连续天数测试工具');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // ========== 工具函数 ==========
  
  const getCurrentWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  };
  
  const getLastMonday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff - 7);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  };
  
  // ========== 测试 1：检查当前状态 ==========
  
  window.checkCurrentStatus = function() {
    console.log('');
    console.log('📊 当前数据状态检查');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 1. 连续天数
    const stats = JSON.parse(localStorage.getItem('dashboardStats') || '{}');
    console.log('');
    console.log('🔥 连续专注天数:', stats.streakDays || 0);
    
    // 2. 主要计划
    const plans = JSON.parse(localStorage.getItem('userPlans') || '[]');
    const primary = plans.find(p => p.isPrimary);
    console.log('');
    console.log('📋 主要计划:', primary?.name || '无');
    console.log('   每日目标:', (primary?.dailyGoalMinutes || 25) + ' 分钟');
    
    // 3. 今日数据
    const today = new Date().toISOString().split('T')[0];
    const todayStatsData = JSON.parse(localStorage.getItem('todayStats') || '{}');
    const todayData = todayStatsData[today] || { minutes: 0 };
    console.log('');
    console.log('📅 今日数据:');
    console.log('   日期:', today);
    console.log('   已专注:', todayData.minutes + ' 分钟');
    console.log('   完成度:', Math.round((todayData.minutes / (primary?.dailyGoalMinutes || 25)) * 100) + '%');
    
    // 4. 昨日数据
    const lastFocusDate = localStorage.getItem('lastFocusDate');
    const yesterdayData = todayStatsData[lastFocusDate || ''] || { minutes: 0 };
    console.log('');
    console.log('📅 昨日数据:');
    console.log('   日期:', lastFocusDate || '无');
    console.log('   已专注:', yesterdayData.minutes + ' 分钟');
    console.log('   是否达标:', yesterdayData.minutes >= (primary?.dailyGoalMinutes || 25) ? '✅ 是' : '❌ 否');
    
    // 5. 周报检查
    const lastWeeklyMailCheck = localStorage.getItem('lastWeeklyMailCheck');
    const currentWeekStart = getCurrentWeekStart();
    console.log('');
    console.log('📧 周报邮件状态:');
    console.log('   本周一:', currentWeekStart);
    console.log('   上次检查:', lastWeeklyMailCheck || '无');
    console.log('   需要生成:', lastWeeklyMailCheck !== currentWeekStart ? '✅ 是' : '❌ 否');
    
    // 6. 信箱邮件
    const customMails = JSON.parse(localStorage.getItem('customMails') || '[]');
    const weeklyMails = customMails.filter(m => m.sender === 'Echo 周报');
    console.log('');
    console.log('📬 信箱中的周报邮件:', weeklyMails.length + ' 封');
    weeklyMails.forEach((m, i) => {
      console.log(`   ${i+1}. ${m.title} (${m.date})`);
    });
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };
  
  // ========== 测试 2：手动生成周报邮件 ==========
  
  window.testGenerateWeeklyMail = async function() {
    console.log('');
    console.log('📧 手动生成周报邮件');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const lastWeekStart = getLastMonday();
    console.log('');
    console.log('上周一日期:', lastWeekStart);
    console.log('');
    console.log('正在生成周报...');
    
    try {
      const response = await fetch('/api/generate-weekly-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: lastWeekStart })
      });
      
      const data = await response.json();
      
      if (data.success && data.mail) {
        console.log('');
        console.log('✅ 周报生成成功！');
        console.log('');
        console.log('📊 周报摘要:');
        console.log('   总时长:', data.reportSummary.totalMinutes + ' 分钟');
        console.log('   连续天数:', data.reportSummary.streakDays + ' 天');
        console.log('   心流指数:', data.reportSummary.flowAvg || 'N/A');
        console.log('');
        console.log('📬 邮件信息:');
        console.log('   标题:', data.mail.title);
        console.log('   日期:', data.mail.date);
        console.log('');
        
        // 添加到信箱（如果 MailSystem 可用）
        if (typeof window !== 'undefined' && window.location.pathname.includes('dashboard')) {
          // 直接添加到 customMails
          const customMails = JSON.parse(localStorage.getItem('customMails') || '[]');
          
          // 检查是否已存在
          if (!customMails.some(m => m.id === data.mail.id)) {
            customMails.unshift(data.mail);
            localStorage.setItem('customMails', JSON.stringify(customMails));
            console.log('✅ 邮件已添加到信箱！');
            console.log('');
            console.log('🔄 即将刷新页面，请打开信箱查看...');
            setTimeout(() => window.location.reload(), 2000);
          } else {
            console.log('ℹ️ 邮件已存在，无需重复添加');
          }
        }
      } else if (data.error) {
        console.error('❌ 生成失败:', data.error);
        
        if (data.code === 'INSUFFICIENT_REGISTRATION_TIME') {
          console.log('');
          console.log('ℹ️ 这不是错误！');
          console.log('   注册时间不足7天，系统设计为第二周才开始生成周报。');
          console.log('   继续专注吧，下周就能收到第一份周报了！');
        }
      }
    } catch (error) {
      console.error('❌ 请求失败:', error);
    }
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };
  
  // ========== 测试 3：模拟昨天有专注（测试连续天数）==========
  
  window.simulateYesterdayFocus = function(minutes) {
    if (typeof minutes !== 'number' || minutes < 0) {
      console.error('❌ 请输入有效的分钟数！');
      console.log('示例：simulateYesterdayFocus(60);');
      return;
    }
    
    console.log('');
    console.log('🧪 模拟昨天有专注（测试用）');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // 设置昨天的数据
    const todayStatsData = JSON.parse(localStorage.getItem('todayStats') || '{}');
    todayStatsData[yesterdayStr] = { minutes, date: yesterdayStr };
    localStorage.setItem('todayStats', JSON.stringify(todayStatsData));
    
    // 设置 lastFocusDate 为昨天
    localStorage.setItem('lastFocusDate', yesterdayStr);
    
    console.log('');
    console.log('✅ 已设置昨天的数据:');
    console.log('   日期:', yesterdayStr);
    console.log('   时长:', minutes + ' 分钟');
    console.log('');
    console.log('🔄 即将刷新页面...');
    console.log('   刷新后，请完成一次小专注（任意时长）');
    console.log('   系统会检测到"新的一天"并更新连续天数');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    setTimeout(() => window.location.reload(), 2000);
  };
  
  // ========== 测试 4：查看信箱邮件 ==========
  
  window.checkMailbox = function() {
    console.log('');
    console.log('📬 信箱邮件列表');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const customMails = JSON.parse(localStorage.getItem('customMails') || '[]');
    
    if (customMails.length === 0) {
      console.log('');
      console.log('ℹ️ 信箱中暂无自定义邮件');
      console.log('   （系统默认邮件不显示在这里）');
    } else {
      console.log('');
      console.log(`共有 ${customMails.length} 封自定义邮件：`);
      console.log('');
      customMails.forEach((m, i) => {
        console.log(`${i+1}. ${m.title}`);
        console.log(`   发件人: ${m.sender}`);
        console.log(`   日期: ${m.date}`);
        console.log(`   状态: ${m.isRead ? '已读' : '未读'}`);
        console.log(`   ID: ${m.id}`);
        console.log('');
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };
  
  // ========== 测试 5：清除周报检查标记（重新触发）==========
  
  window.resetWeeklyMailCheck = function() {
    console.log('');
    console.log('🔧 清除周报检查标记');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const before = localStorage.getItem('lastWeeklyMailCheck');
    localStorage.removeItem('lastWeeklyMailCheck');
    
    console.log('');
    console.log('✅ 已清除标记');
    console.log('   之前:', before || '无');
    console.log('');
    console.log('🔄 刷新页面后，系统会重新检查并生成周报邮件');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    setTimeout(() => window.location.reload(), 2000);
  };
  
  // ========== 显示使用说明 ==========
  
  console.log('');
  console.log('📌 可用的测试命令：');
  console.log('');
  console.log('1️⃣ checkCurrentStatus()');
  console.log('   查看当前的连续天数、主要计划、今日数据等');
  console.log('');
  console.log('2️⃣ testGenerateWeeklyMail()');
  console.log('   手动生成周报邮件（上周的）');
  console.log('');
  console.log('3️⃣ simulateYesterdayFocus(60)');
  console.log('   模拟昨天有60分钟专注（用于测试连续天数）');
  console.log('   参数：专注分钟数');
  console.log('');
  console.log('4️⃣ checkMailbox()');
  console.log('   查看信箱中的所有自定义邮件');
  console.log('');
  console.log('5️⃣ resetWeeklyMailCheck()');
  console.log('   清除周报检查标记，刷新后重新生成周报');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('💡 建议测试流程：');
  console.log('');
  console.log('步骤 1：checkCurrentStatus()  // 查看当前状态');
  console.log('步骤 2：testGenerateWeeklyMail()  // 生成周报邮件');
  console.log('步骤 3：checkMailbox()  // 确认邮件已添加');
  console.log('步骤 4：在 Dashboard 点击信箱图标查看邮件');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('✅ 测试工具已加载！现在可以运行测试命令了。');
  console.log('');
})();

