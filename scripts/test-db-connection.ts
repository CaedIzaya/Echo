/**
 * 数据库连接测试脚本
 * 用于测试 Neon PostgreSQL 数据库连接和基本操作
 * 
 * 使用方法:
 * npx tsx scripts/test-db-connection.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

interface TestResult {
  name: string;
  status: "✅ 成功" | "❌ 失败";
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

async function testConnection() {
  console.log("🔍 开始测试数据库连接...\n");
  console.log("📋 环境信息:");
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || "未设置"}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? "已设置 ✅" : "未设置 ❌"}`);
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    const isNeon = url.includes("neon.tech");
    const isPooler = url.includes("pooler");
    console.log(`   数据库类型: ${isNeon ? "Neon PostgreSQL ✅" : "其他"}`);
    console.log(`   使用连接池: ${isPooler ? "是 ✅" : "否"}`);
  }
  console.log("\n" + "=".repeat(60) + "\n");

  // 测试 1: 基本连接
  await test("1. 基本连接测试", async () => {
    await prisma.$connect();
    return "数据库连接成功";
  });

  // 测试 2: 简单查询
  await test("2. 简单查询测试", async () => {
    const result = await prisma.$queryRaw<{ result: number }[]>`SELECT 1 as result`;
    if (result[0]?.result === 1) {
      return "查询执行成功";
    }
    throw new Error("查询结果不正确");
  });

  // 测试 3: 表结构检查
  await test("3. 表结构检查", async () => {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    
    const tableNames = tables.map(t => t.tablename);
    const requiredTables = ["User", "Project", "FocusSession", "DailySummary"];
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length > 0) {
      throw new Error(`缺少表: ${missingTables.join(", ")}`);
    }
    
    return `找到 ${tables.length} 个表`;
  });

  // 测试 4: 用户表查询
  await test("4. 用户表查询", async () => {
    const count = await prisma.user.count();
    return `用户数量: ${count}`;
  });

  // 测试 5: 创建测试数据
  await test("5. 写入测试（创建临时用户）", async () => {
    const testUserId = `test_${Date.now()}`;
    
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        email: `test_${Date.now()}@test.com`,
        name: "测试用户",
        hasCompletedOnboarding: false,
      },
    });
    
    // 验证创建
    const found = await prisma.user.findUnique({
      where: { id: testUserId },
    });
    
    if (!found) {
      throw new Error("创建的用户无法找到");
    }
    
    // 删除测试用户
    await prisma.user.delete({
      where: { id: testUserId },
    });
    
    return "数据写入和删除成功";
  });

  // 测试 6: 事务测试
  await test("6. 事务测试", async () => {
    const testUserId = `test_tx_${Date.now()}`;
    
    try {
      await prisma.$transaction(async (tx) => {
        // 创建用户
        await tx.user.create({
          data: {
            id: testUserId,
            email: `test_tx_${Date.now()}@test.com`,
            name: "事务测试用户",
          },
        });
        
        // 故意抛出错误来测试回滚
        throw new Error("测试回滚");
      });
    } catch (error) {
      // 验证用户未被创建（事务回滚成功）
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      
      if (user) {
        throw new Error("事务回滚失败");
      }
      
      return "事务回滚成功";
    }
    
    throw new Error("事务应该失败但没有失败");
  });

  // 测试 7: 连接池测试
  await test("7. 并发查询测试（连接池）", async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      prisma.$queryRaw`SELECT ${i} as num`
    );
    
    await Promise.all(promises);
    return "5个并发查询全部成功";
  });

  // 测试 8: 复杂查询测试
  await test("8. 复杂关联查询测试", async () => {
    const users = await prisma.user.findMany({
      take: 1,
      include: {
        projects: true,
        focusSessions: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });
    
    return `查询到 ${users.length} 个用户及其关联数据`;
  });

  // 打印结果
  console.log("\n" + "=".repeat(60));
  console.log("📊 测试结果汇总:\n");
  
  results.forEach((result) => {
    console.log(`${result.status} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.duration) {
      console.log(`   耗时: ${result.duration}ms`);
    }
    console.log();
  });

  const successCount = results.filter(r => r.status === "✅ 成功").length;
  const totalCount = results.length;
  
  console.log("=".repeat(60));
  console.log(`\n🎯 总体结果: ${successCount}/${totalCount} 测试通过\n`);
  
  if (successCount === totalCount) {
    console.log("✅ 数据库连接和操作完全正常！");
    console.log("   如果 Vercel 上出现数据不保存的问题，可能是：");
    console.log("   1. Vercel 环境变量配置不正确");
    console.log("   2. Vercel 使用了不同的 DATABASE_URL");
    console.log("   3. 应用代码中的数据持久化逻辑有问题");
    console.log("\n💡 请运行: npx tsx scripts/check-vercel-config.ts");
  } else {
    console.log("⚠️  部分测试失败，请检查上述错误信息");
  }
  
  return successCount === totalCount;
}

async function test(name: string, fn: () => Promise<string>) {
  const startTime = Date.now();
  try {
    const message = await fn();
    const duration = Date.now() - startTime;
    results.push({
      name,
      status: "✅ 成功",
      message,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      name,
      status: "❌ 失败",
      message,
      duration,
    });
  }
}

// 主函数
async function main() {
  try {
    const allPassed = await testConnection();
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error("\n❌ 测试过程中发生错误:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


