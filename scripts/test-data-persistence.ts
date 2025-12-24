#!/usr/bin/env tsx
/**
 * 数据持久化测试脚本
 * 
 * 用途：测试用户经验值和等级是否正确保存到数据库
 * 运行：npx tsx scripts/test-data-persistence.ts
 */

import { db } from '../src/server/db';

async function testDataPersistence() {
  console.log('🧪 开始测试数据持久化...\n');

  try {
    // 1. 获取所有用户
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        userExp: true,
        userLevel: true,
        heartTreeTotalExp: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (users.length === 0) {
      console.log('❌ 未找到任何用户数据');
      console.log('提示：请先登录并完成至少一次专注\n');
      return;
    }

    console.log(`✅ 找到 ${users.length} 个用户\n`);

    // 2. 显示每个用户的数据
    users.forEach((user, index) => {
      console.log(`用户 ${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email || '未设置'}`);
      console.log(`  经验值: ${user.userExp}`);
      console.log(`  等级: ${user.userLevel}`);
      console.log(`  心树总经验: ${user.heartTreeTotalExp}`);
      console.log(`  创建时间: ${user.createdAt.toLocaleString('zh-CN')}`);
      console.log('');
    });

    // 3. 检查专注记录
    console.log('检查专注记录...');
    const focusSessions = await db.focusSession.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        duration: true,
        startTime: true,
        expEarned: true,
        userId: true,
      },
    });

    if (focusSessions.length === 0) {
      console.log('❌ 未找到任何专注记录\n');
    } else {
      console.log(`✅ 找到 ${focusSessions.length} 条最近的专注记录\n`);
      focusSessions.forEach((session, index) => {
        console.log(`专注 ${index + 1}:`);
        console.log(`  时长: ${session.duration} 分钟`);
        console.log(`  开始时间: ${session.startTime.toLocaleString('zh-CN')}`);
        console.log(`  获得经验: ${session.expEarned || '未记录'}`);
        console.log('');
      });
    }

    // 4. 检查Schema字段是否存在
    console.log('检查数据库Schema...');
    const tableInfo = await db.$queryRaw<any[]>`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name IN ('userExp', 'userLevel', 'flowMetrics', 'heartTreeTotalExp')
    `;

    if (tableInfo.length > 0) {
      console.log('✅ 关键字段存在:');
      tableInfo.forEach((col: any) => {
        console.log(`  ${col.column_name}: ${col.data_type}`);
      });
      console.log('');
    }

    // 5. 总结
    console.log('📊 数据持久化测试总结:');
    console.log(`  - 用户数量: ${users.length}`);
    console.log(`  - 专注记录: ${focusSessions.length}`);
    console.log(`  - 数据库字段: ${tableInfo.length}/4`);
    
    const hasData = users.some(u => u.userExp > 0 || u.heartTreeTotalExp > 0);
    if (hasData) {
      console.log('\n✅ 数据持久化正常工作！');
    } else {
      console.log('\n⚠️  用户数据存在但经验值为0，请完成专注任务以测试');
    }

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    console.error('\n可能的原因:');
    console.error('  1. 数据库连接失败');
    console.error('  2. Schema未同步（运行: npx prisma db push）');
    console.error('  3. 环境变量未配置（检查.env文件）');
    console.error('\n详细错误:');
    console.error(error);
  } finally {
    await db.$disconnect();
  }
}

// 运行测试
testDataPersistence();









