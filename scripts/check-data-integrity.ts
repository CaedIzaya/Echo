/**
 * 数据完整性检查脚本
 * 用于诊断用户数据是否正确同步
 * 
 * 使用方法：
 * npx tsx scripts/check-data-integrity.ts <user-email>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDataIntegrity(userEmail: string) {
  console.log('🔍 开始检查数据完整性...\n');
  
  try {
    // 1. 查找用户
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        focusSessions: {
          orderBy: { startTime: 'desc' },
          take: 10,
        },
        achievements: {
          orderBy: { unlockedAt: 'desc' },
        },
      },
    });

    if (!user) {
      console.error('❌ 用户不存在:', userEmail);
      return;
    }

    console.log('✅ 找到用户:', user.email);
    console.log('📊 用户数据摘要:');
    console.log('  - 用户ID:', user.id);
    console.log('  - 创建时间:', user.createdAt);
    console.log('  - 用户经验:', user.userExp);
    console.log('  - 用户等级:', user.userLevel);
    console.log('  - 心树等级:', user.heartTreeLevel);
    console.log('  - 心树经验:', user.heartTreeTotalExp);
    console.log('  - 心树名称:', user.heartTreeName);
    console.log('  - 已完成引导:', user.hasCompletedOnboarding);

    // 2. 检查专注记录
    console.log('\n📝 专注记录:');
    console.log('  - 总记录数:', user.focusSessions.length);
    
    if (user.focusSessions.length > 0) {
      console.log('  - 最近10条记录:');
      user.focusSessions.forEach((session, index) => {
        console.log(`    ${index + 1}. ${session.startTime.toISOString().split('T')[0]} - ${session.duration}分钟 ${session.expEarned ? `(+${session.expEarned} EXP)` : ''}`);
      });

      // 计算总专注时长
      const totalFocusSessions = await prisma.focusSession.count({
        where: { userId: user.id },
      });
      
      const totalMinutesResult = await prisma.focusSession.aggregate({
        where: { userId: user.id },
        _sum: { duration: true },
      });
      
      const totalMinutes = totalMinutesResult._sum.duration || 0;
      
      console.log(`  - 累计专注次数: ${totalFocusSessions}`);
      console.log(`  - 累计专注时长: ${totalMinutes} 分钟 (${(totalMinutes / 60).toFixed(1)} 小时)`);
    }

    // 3. 检查成就
    console.log('\n🏆 成就解锁:');
    console.log('  - 总成就数:', user.achievements.length);
    
    if (user.achievements.length > 0) {
      console.log('  - 已解锁成就:');
      user.achievements.forEach((achievement, index) => {
        console.log(`    ${index + 1}. ${achievement.achievementId} (${achievement.category}) - ${achievement.unlockedAt.toISOString().split('T')[0]}`);
      });
    }

    // 4. 数据一致性检查
    console.log('\n🔬 数据一致性检查:');
    
    // 检查：用户经验是否为负数
    if (user.userExp < 0) {
      console.log('  ⚠️  警告：用户经验为负数!');
    } else {
      console.log('  ✅ 用户经验值正常');
    }
    
    // 检查：用户等级是否合理
    if (user.userLevel < 1) {
      console.log('  ⚠️  警告：用户等级小于1!');
    } else {
      console.log('  ✅ 用户等级正常');
    }
    
    // 检查：是否有专注记录但经验为0
    if (user.focusSessions.length > 0 && user.userExp === 0) {
      console.log('  ⚠️  警告：有专注记录但用户经验为0，可能数据未同步!');
    } else if (user.focusSessions.length > 0) {
      console.log('  ✅ 专注记录与经验值匹配');
    }

    // 5. 建议
    console.log('\n💡 建议:');
    if (user.focusSessions.length === 0 && user.userExp === 0) {
      console.log('  - 这是一个新用户账号，数据正常');
    } else if (user.userExp < 100 && user.focusSessions.length > 5) {
      console.log('  - 专注次数较多但经验值较低，可能需要同步数据');
      console.log('  - 建议用户在前端点击"同步数据"按钮');
    } else {
      console.log('  - 数据看起来正常，无异常');
    }

  } catch (error: any) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 从命令行参数获取邮箱
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('❌ 请提供用户邮箱');
  console.log('使用方法: npx tsx scripts/check-data-integrity.ts <user-email>');
  process.exit(1);
}

checkDataIntegrity(userEmail);




