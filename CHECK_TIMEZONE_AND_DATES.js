/**
 * 时区和日期确认工具
 * 
 * 使用方法：
 * 1. 打开任意页面（建议 Dashboard）
 * 2. 按 F12 打开浏览器控制台
 * 3. 复制粘贴此文件全部内容并按回车
 * 4. 运行 checkTimezone() 查看时区信息
 */

(function() {
  console.log('🌍 时区和日期确认工具');
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
    const day = ref.getDay(); // 0 (Sun) - 6 (Sat)
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(ref);
    start.setDate(ref.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };
  
  const formatLabel = (start, end) => {
    const fmt = (d) => {
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${month}/${day}`;
    };
    return `${fmt(start)} - ${fmt(end)}`;
  };
  
  // ========== 主检查函数 ==========
  
  window.checkTimezone = function() {
    console.log('');
    console.log('🌍 用户时区信息');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const now = new Date();
    
    console.log('');
    console.log('📅 当前时间:');
    console.log('   本地时间:', now.toLocaleString('zh-CN'));
    console.log('   UTC 时间:', now.toISOString());
    console.log('   时区偏移:', now.getTimezoneOffset() + ' 分钟');
    console.log('   时区名称:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    // 检查今天的日期
    const todayLocal = formatDateKey(now);
    const todayUTC = now.toISOString().slice(0, 10);
    
    console.log('');
    console.log('📅 今日日期:');
    console.log('   本地时区:', todayLocal);
    console.log('   UTC 时区:', todayUTC);
    if (todayLocal !== todayUTC) {
      console.warn('   ⚠️ 警告：本地和UTC日期不同！');
    } else {
      console.log('   ✅ 本地和UTC日期一致');
    }
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };
  
  window.checkWeekDates = function() {
    console.log('');
    console.log('📅 本周和上周的日期区间');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const now = new Date();
    
    // 本周
    const thisWeek = getWeekRange(now);
    const thisWeekStart = formatDateKey(thisWeek.start);
    const thisWeekEnd = formatDateKey(thisWeek.end);
    
    console.log('');
    console.log('📊 本周（当前周）:');
    console.log('   开始:', thisWeekStart, '(周一)');
    console.log('   结束:', thisWeekEnd, '(周日)');
    console.log('   标签:', formatLabel(thisWeek.start, thisWeek.end));
    
    // 生成本周7天日期
    const thisWeekDates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(thisWeek.start);
      day.setDate(thisWeek.start.getDate() + i);
      thisWeekDates.push(formatDateKey(day));
    }
    console.log('   7天:', thisWeekDates.join(', '));
    
    // 上周
    const lastMonday = new Date(thisWeek.start);
    lastMonday.setDate(lastMonday.getDate() - 7);
    const lastWeek = getWeekRange(lastMonday);
    const lastWeekStart = formatDateKey(lastWeek.start);
    const lastWeekEnd = formatDateKey(lastWeek.end);
    
    console.log('');
    console.log('📊 上周:');
    console.log('   开始:', lastWeekStart, '(周一)');
    console.log('   结束:', lastWeekEnd, '(周日)');
    console.log('   标签:', formatLabel(lastWeek.start, lastWeek.end));
    
    // 生成上周7天日期
    const lastWeekDates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(lastWeek.start);
      day.setDate(lastWeek.start.getDate() + i);
      lastWeekDates.push(formatDateKey(day));
    }
    console.log('   7天:', lastWeekDates.join(', '));
    
    console.log('');
    console.log('💡 提示：');
    console.log('   如果你认为上周是 12/15-12/21，请对比以上日期是否正确。');
    console.log('   如果不正确，可能是时区或星期计算问题。');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };
  
  window.checkMailboxDates = function() {
    console.log('');
    console.log('📧 信箱中的周报邮件日期');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const customMails = JSON.parse(localStorage.getItem('customMails') || '[]');
    const weeklyMails = customMails.filter(m => m.sender === 'Echo 周报');
    
    if (weeklyMails.length === 0) {
      console.log('');
      console.log('ℹ️ 信箱中暂无周报邮件');
    } else {
      console.log('');
      console.log(`共有 ${weeklyMails.length} 封周报邮件：`);
      console.log('');
      weeklyMails.forEach((m, i) => {
        console.log(`${i+1}. ${m.title}`);
        console.log(`   邮件日期: ${m.date}`);
        console.log(`   查看链接: ${m.actionUrl}`);
        
        // 解析 weekStart 参数
        const urlMatch = m.actionUrl.match(/weekStart=([0-9-]+)/);
        if (urlMatch) {
          const weekStart = urlMatch[1];
          const start = new Date(weekStart);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          
          console.log(`   周期范围: ${formatDateKey(start)} 至 ${formatDateKey(end)}`);
          console.log(`   标签: ${formatLabel(start, end)}`);
        }
        console.log('');
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };
  
  window.generateTestWeeklyMail = async function() {
    console.log('');
    console.log('🧪 生成测试周报邮件');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 计算上周一
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + diff);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastWeekStart = formatDateKey(lastMonday);
    
    console.log('');
    console.log('📅 准备生成周报:');
    console.log('   上周一日期:', lastWeekStart);
    console.log('');
    console.log('正在请求 API...');
    
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
        console.log('📊 周报信息:');
        console.log('   标题:', data.mail.title);
        console.log('   邮件ID:', data.mail.id);
        console.log('   查看链接:', data.mail.actionUrl);
        console.log('');
        console.log('📈 数据摘要:');
        console.log('   总时长:', data.reportSummary.totalMinutes, '分钟');
        console.log('   连续天数:', data.reportSummary.streakDays, '天');
        console.log('   心流指数:', data.reportSummary.flowAvg || 'N/A');
        console.log('');
        
        // 添加到信箱
        const customMails = JSON.parse(localStorage.getItem('customMails') || '[]');
        if (!customMails.some(m => m.id === data.mail.id)) {
          customMails.unshift(data.mail);
          localStorage.setItem('customMails', JSON.stringify(customMails));
          console.log('✅ 邮件已添加到信箱');
          console.log('');
          console.log('🔄 即将刷新页面，请打开信箱查看...');
          setTimeout(() => window.location.reload(), 2000);
        } else {
          console.log('ℹ️ 邮件已存在');
        }
      } else if (data.error) {
        console.error('');
        console.error('❌ 生成失败:', data.error);
        if (data.code === 'INSUFFICIENT_REGISTRATION_TIME') {
          console.log('');
          console.log('ℹ️ 这不是错误！注册不足7天不生成周报。');
        }
      }
    } catch (error) {
      console.error('');
      console.error('❌ 请求失败:', error);
    }
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };
  
  // ========== 使用说明 ==========
  
  console.log('');
  console.log('📌 可用的检查命令：');
  console.log('');
  console.log('1️⃣ checkTimezone()');
  console.log('   查看你的时区信息和当前日期');
  console.log('');
  console.log('2️⃣ checkWeekDates()');
  console.log('   查看本周和上周的日期区间（7天列表）');
  console.log('   ⚠️ 用这个来确认区间是否正确！');
  console.log('');
  console.log('3️⃣ checkMailboxDates()');
  console.log('   查看信箱中所有周报邮件的日期区间');
  console.log('');
  console.log('4️⃣ generateTestWeeklyMail()');
  console.log('   手动生成一份周报邮件（用于测试）');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('💡 建议执行顺序：');
  console.log('');
  console.log('步骤 1：checkTimezone()  // 确认你的时区');
  console.log('步骤 2：checkWeekDates()  // 查看本周和上周的日期');
  console.log('步骤 3：如果上周是 12/15-12/21，确认日期是否匹配');
  console.log('步骤 4：generateTestWeeklyMail()  // 生成测试邮件');
  console.log('步骤 5：checkMailboxDates()  // 确认邮箱中的日期');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('✅ 工具已加载！现在运行 checkTimezone() 开始检查。');
  console.log('');
})();





