/**
 * 数据库数据完整性验证脚本
 * 
 * 用途：检查数据库中的数据是否正确保存
 * 运行：node scripts/verify-database-data.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 开始验证数据库数据完整性...\n');

  try {
    // 1. 检查用户数据
    console.log('📊 1. 检查用户数据');
    console.log('─'.repeat(60));
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        userExp: true,
        userLevel: true,
        heartTreeLevel: true,
        heartTreeTotalExp: true,
        totalFocusMinutes: true,
        streakDays: true,
        createdAt: true,
      },
    });

    console.log(`找到 ${users.length} 个用户\n`);
    
    for (const user of users) {
      console.log(`用户: ${user.name || user.email || user.id}`);
      console.log(`  - 经验值: ${user.userExp} (等级 ${user.userLevel})`);
      console.log(`  - 心树: Lv${user.heartTreeLevel} (${user.heartTreeTotalExp} EXP)`);
      console.log(`  - 累计专注: ${user.totalFocusMinutes} 分钟`);
      console.log(`  - 连续天数: ${user.streakDays} 天`);
      console.log(`  - 注册时间: ${user.createdAt.toISOString()}\n`);
    }

    // 2. 检查专注记录
    console.log('📊 2. 检查专注记录');
    console.log('─'.repeat(60));
    
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getCurrentWeekStart();
    
    for (const user of users) {
      console.log(`\n用户: ${user.name || user.email}`);
      
      // 今日专注
      const todaySessions = await prisma.focusSession.findMany({
        where: {
          userId: user.id,
          startTime: {
            gte: new Date(`${today}T00:00:00.000Z`),
            lte: new Date(`${today}T23:59:59.999Z`),
          },
        },
        orderBy: { startTime: 'desc' },
      });

      const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      console.log(`  ✅ 今日专注: ${todayMinutes} 分钟 (${todaySessions.length} 次)`);
      
      if (todaySessions.length > 0) {
        todaySessions.forEach((s, i) => {
          console.log(`     ${i + 1}. ${s.duration}分钟 - ${s.startTime.toISOString()}`);
        });
      }

      // 本周专注
      const weekSessions = await prisma.focusSession.findMany({
        where: {
          userId: user.id,
          startTime: {
            gte: new Date(`${weekStart}T00:00:00.000Z`),
          },
        },
      });

      const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      console.log(`  ✅ 本周专注: ${weekMinutes} 分钟 (${weekSessions.length} 次)`);

      // 累计专注
      const totalSessions = await prisma.focusSession.count({
        where: { userId: user.id },
      });

      const totalMinutesFromDb = await prisma.focusSession.aggregate({
        where: { userId: user.id },
        _sum: { duration: true },
      });

      const totalMinutes = totalMinutesFromDb._sum.duration || 0;
      console.log(`  ✅ 累计专注: ${totalMinutes} 分钟 (${totalSessions} 次)`);
      
      // 验证数据一致性
      if (user.totalFocusMinutes !== totalMinutes) {
        console.log(`  ⚠️ 数据不一致！User表: ${user.totalFocusMinutes}, 实际: ${totalMinutes}`);
        console.log(`     建议：运行数据修复脚本`);
      }
    }

    // 3. 检查计划和小目标
    console.log('\n📊 3. 检查计划和小目标');
    console.log('─'.repeat(60));
    
    for (const user of users) {
      const projects = await prisma.project.findMany({
        where: { userId: user.id },
        include: {
          milestones: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      console.log(`\n用户: ${user.name || user.email}`);
      console.log(`  ✅ 计划总数: ${projects.length}`);
      
      projects.forEach((p, i) => {
        const completedCount = p.milestones.filter(m => m.isCompleted).length;
        console.log(`     ${i + 1}. ${p.name} ${p.isPrimary ? '⭐主计划' : ''}`);
        console.log(`        - 小目标: ${completedCount}/${p.milestones.length} 已完成`);
        console.log(`        - 每日目标: ${p.dailyGoalMinutes} 分钟`);
      });
    }

    // 4. 检查本周完成的小目标
    console.log('\n📊 4. 检查本周完成的小目标');
    console.log('─'.repeat(60));
    
    const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
    
    for (const user of users) {
      const completedMilestones = await prisma.milestone.findMany({
        where: {
          project: { userId: user.id },
          isCompleted: true,
          updatedAt: {
            gte: weekStartDate,
          },
        },
        include: {
          project: {
            select: { name: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      console.log(`\n用户: ${user.name || user.email}`);
      console.log(`  ✅ 本周完成: ${completedMilestones.length} 个小目标`);
      
      completedMilestones.forEach((m, i) => {
        console.log(`     ${i + 1}. ${m.title} (${m.project.name})`);
        console.log(`        完成时间: ${m.updatedAt.toISOString()}`);
      });
    }

    // 5. 检查成就
    console.log('\n📊 5. 检查成就');
    console.log('─'.repeat(60));
    
    for (const user of users) {
      const achievements = await prisma.achievement.findMany({
        where: { userId: user.id },
        orderBy: { unlockedAt: 'desc' },
      });

      console.log(`\n用户: ${user.name || user.email}`);
      console.log(`  ✅ 解锁成就: ${achievements.length} 个`);
      
      achievements.slice(0, 5).forEach((a, i) => {
        console.log(`     ${i + 1}. ${a.achievementId} (${a.category})`);
        console.log(`        解锁时间: ${a.unlockedAt.toISOString()}`);
      });
      
      if (achievements.length > 5) {
        console.log(`     ... 还有 ${achievements.length - 5} 个`);
      }
    }

    // 6. 检查周报
    console.log('\n📊 6. 检查周报记录');
    console.log('─'.repeat(60));
    
    for (const user of users) {
      const reports = await prisma.weeklyReport.findMany({
        where: { userId: user.id },
        orderBy: { weekStart: 'desc' },
        take: 4,
        select: {
          weekStart: true,
          totalMinutes: true,
          streakDays: true,
          flowAvg: true,
          createdAt: true,
        },
      });

      console.log(`\n用户: ${user.name || user.email}`);
      console.log(`  ✅ 周报记录: ${reports.length} 份`);
      
      reports.forEach((r, i) => {
        console.log(`     ${i + 1}. 周 ${r.weekStart.toISOString().split('T')[0]}`);
        console.log(`        - ${r.totalMinutes} 分钟, ${r.streakDays} 天连续`);
        if (r.flowAvg) console.log(`        - 心流: ${r.flowAvg}`);
      });
    }

    console.log('\n✅ 验证完成！\n');
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

main().catch(console.error);

