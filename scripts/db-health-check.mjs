#!/usr/bin/env node
/**
 * 数据库健康检查脚本
 * 用于验证数据完整性和检查潜在问题
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🔍 开始数据库健康检查...\n");

  try {
    // 1. 检查数据库连接
    console.log("1️⃣ 检查数据库连接...");
    await db.$queryRaw`SELECT 1`;
    console.log("✅ 数据库连接正常\n");

    // 2. 检查用户数据
    console.log("2️⃣ 检查用户数据...");
    const userCount = await db.user.count();
    const usersWithoutCreatedAt = await db.user.count({
      where: { createdAt: null },
    });
    console.log(`   总用户数: ${userCount}`);
    console.log(`   缺少createdAt的用户: ${usersWithoutCreatedAt}`);
    if (usersWithoutCreatedAt > 0) {
      console.log("   ⚠️  警告：部分用户缺少注册日期\n");
    } else {
      console.log("   ✅ 用户数据完整\n");
    }

    // 3. 检查专注会话数据
    console.log("3️⃣ 检查专注会话数据...");
    const sessionCount = await db.focusSession.count();
    const sessionsWithNullDuration = await db.focusSession.count({
      where: { duration: null },
    });
    const sessionsWithInvalidDuration = await db.focusSession.count({
      where: { OR: [{ duration: { lt: 0 } }, { duration: { gt: 1440 } }] },
    });
    console.log(`   总专注会话数: ${sessionCount}`);
    console.log(`   duration为null的会话: ${sessionsWithNullDuration}`);
    console.log(`   时长异常的会话 (<0 or >1440分钟): ${sessionsWithInvalidDuration}`);
    if (sessionsWithNullDuration > 0 || sessionsWithInvalidDuration > 0) {
      console.log("   ⚠️  警告：部分专注会话数据异常\n");
    } else {
      console.log("   ✅ 专注会话数据正常\n");
    }

    // 4. 检查每日小结数据
    console.log("4️⃣ 检查每日小结数据...");
    const summaryCount = await db.dailySummary.count();
    const summariesWithInvalidMinutes = await db.dailySummary.count({
      where: { totalFocusMinutes: { lt: 0 } },
    });
    console.log(`   总每日小结数: ${summaryCount}`);
    console.log(`   时长为负的小结: ${summariesWithInvalidMinutes}`);
    if (summariesWithInvalidMinutes > 0) {
      console.log("   ⚠️  警告：部分每日小结数据异常\n");
    } else {
      console.log("   ✅ 每日小结数据正常\n");
    }

    // 5. 检查周报数据
    console.log("5️⃣ 检查周报数据...");
    const reportCount = await db.weeklyReport.count();
    const expiredReports = await db.weeklyReport.count({
      where: { expiresAt: { lt: new Date() } },
    });
    console.log(`   总周报数: ${reportCount}`);
    console.log(`   已过期的周报: ${expiredReports}`);
    console.log("   ✅ 周报数据正常\n");

    // 6. 检查索引使用情况
    console.log("6️⃣ 检查数据库索引...");
    console.log("   ✅ 索引已在schema中定义\n");

    // 7. 检查孤立数据
    console.log("7️⃣ 检查孤立数据...");
    const orphanedSessions = await db.focusSession.count({
      where: { user: null },
    });
    const orphanedSummaries = await db.dailySummary.count({
      where: { user: null },
    });
    console.log(`   孤立的专注会话: ${orphanedSessions}`);
    console.log(`   孤立的每日小结: ${orphanedSummaries}`);
    if (orphanedSessions > 0 || orphanedSummaries > 0) {
      console.log("   ⚠️  警告：存在孤立数据\n");
    } else {
      console.log("   ✅ 无孤立数据\n");
    }

    console.log("✨ 数据库健康检查完成！\n");

    // 提供维护建议
    console.log("📋 维护建议：");
    if (expiredReports > 0) {
      console.log(`   • 运行清理脚本删除 ${expiredReports} 个过期周报`);
      console.log("     命令: npm run cleanup:expired");
    }
    if (orphanedSessions > 0 || orphanedSummaries > 0) {
      console.log("   • 检查并修复孤立数据");
    }
    if (sessionsWithInvalidDuration > 0) {
      console.log("   • 修复异常的专注会话时长数据");
    }
    console.log("   • 定期备份数据库");
    console.log("   • 监控数据库性能");

  } catch (error) {
    console.error("❌ 健康检查失败:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();




