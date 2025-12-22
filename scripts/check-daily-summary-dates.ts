#!/usr/bin/env tsx
/**
 * 检查今日小结日期的调试脚本
 * 
 * 用途：验证数据库中小结的日期格式和时区问题
 * 运行：npx tsx scripts/check-daily-summary-dates.ts
 */

import { db } from '../src/server/db';

async function checkDates() {
  console.log('🔍 检查今日小结日期...\n');

  try {
    // 1. 获取最近的小结记录
    const summaries = await db.dailySummary.findMany({
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        id: true,
        date: true,
        text: true,
        userId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (summaries.length === 0) {
      console.log('❌ 未找到任何小结记录\n');
      return;
    }

    console.log(`✅ 找到 ${summaries.length} 条最近的小结\n`);
    
    // 2. 显示每条小结的详细信息
    summaries.forEach((summary, index) => {
      console.log(`小结 ${index + 1}:`);
      console.log(`  日期字段 (date): ${summary.date}`);
      console.log(`  创建时间 (UTC): ${summary.createdAt.toISOString()}`);
      console.log(`  更新时间 (UTC): ${summary.updatedAt.toISOString()}`);
      console.log(`  内容预览: "${summary.text.substring(0, 30)}..."`);
      console.log('');
    });

    // 3. 检查日期格式是否正确
    console.log('📊 日期格式检查:');
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    summaries.forEach((summary, index) => {
      const isValid = datePattern.test(summary.date);
      const status = isValid ? '✅' : '❌';
      console.log(`  ${status} 小结${index + 1}: ${summary.date} ${isValid ? '' : '(格式错误)'}`);
    });
    console.log('');

    // 4. 检查今天的日期（不同时区）
    console.log('🌍 日期对比:');
    const serverUTC = new Date().toISOString().split('T')[0];
    const localDate = new Date().toLocaleDateString('en-CA');
    console.log(`  服务器UTC日期: ${serverUTC}`);
    console.log(`  本地日期 (en-CA): ${localDate}`);
    console.log('');

    // 5. 检查是否有今天的小结
    const todayUTC = summaries.find(s => s.date === serverUTC);
    const todayLocal = summaries.find(s => s.date === localDate);
    
    console.log('📅 今天的小结:');
    if (todayUTC) {
      console.log(`  ✅ 找到UTC今天的小结 (${serverUTC})`);
    } else {
      console.log(`  ❌ 没有UTC今天的小结 (${serverUTC})`);
    }
    
    if (todayLocal && todayLocal.date !== serverUTC) {
      console.log(`  ✅ 找到本地今天的小结 (${localDate})`);
    } else if (todayLocal) {
      console.log(`  ℹ️  本地日期和UTC日期相同`);
    } else {
      console.log(`  ❌ 没有本地今天的小结 (${localDate})`);
    }
    console.log('');

    // 6. 时区差异分析
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = now.getHours();
    const timezoneOffset = now.getTimezoneOffset() / -60;
    
    console.log('⏰ 时区信息:');
    console.log(`  UTC时间: ${now.toISOString()}`);
    console.log(`  本地时间: ${now.toLocaleString()}`);
    console.log(`  时区偏移: UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`);
    console.log(`  UTC小时: ${utcHour}, 本地小时: ${localHour}`);
    
    if (serverUTC !== localDate) {
      console.log(`  ⚠️  警告: UTC日期和本地日期不一致！`);
      console.log(`     这可能导致"今日小结"显示错误的日期`);
    }
    console.log('');

    // 7. 总结
    console.log('📝 诊断总结:');
    if (summaries.every(s => datePattern.test(s.date))) {
      console.log('  ✅ 所有日期格式正确 (YYYY-MM-DD)');
    } else {
      console.log('  ❌ 存在日期格式错误');
    }
    
    if (serverUTC === localDate) {
      console.log('  ✅ UTC日期和本地日期一致，不存在时区问题');
    } else {
      console.log('  ⚠️  UTC日期和本地日期不一致，需要使用客户端日期');
      console.log('     建议: API应该接受客户端传递的日期参数');
    }

  } catch (error: any) {
    console.error('❌ 检查失败:', error.message);
    console.error('\n详细错误:');
    console.error(error);
  } finally {
    await db.$disconnect();
  }
}

// 运行检查
checkDates();

