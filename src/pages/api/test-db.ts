/**
 * 数据库连接测试 API
 * 用于在 Vercel 上测试数据库连接和操作
 * 
 * 访问: https://your-app.vercel.app/api/test-db
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "~/server/db";

interface TestResult {
  success: boolean;
  timestamp: string;
  environment: {
    nodeEnv: string;
    hasDatabaseUrl: boolean;
    databaseType?: string;
    isPooler?: boolean;
  };
  tests: {
    connection: { passed: boolean; message: string };
    simpleQuery: { passed: boolean; message: string };
    tableCount: { passed: boolean; message: string; count?: number };
    userCount: { passed: boolean; message: string; count?: number };
    writeTest: { passed: boolean; message: string };
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResult>
) {
  const timestamp = new Date().toISOString();
  const result: TestResult = {
    success: false,
    timestamp,
    environment: {
      nodeEnv: process.env.NODE_ENV || "未设置",
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseType: process.env.DATABASE_URL?.includes("neon.tech") ? "Neon PostgreSQL" : "其他",
      isPooler: process.env.DATABASE_URL?.includes("pooler"),
    },
    tests: {
      connection: { passed: false, message: "" },
      simpleQuery: { passed: false, message: "" },
      tableCount: { passed: false, message: "" },
      userCount: { passed: false, message: "" },
      writeTest: { passed: false, message: "" },
    },
  };

  try {
    // 测试 1: 连接测试
    try {
      await db.$connect();
      result.tests.connection = {
        passed: true,
        message: "数据库连接成功",
      };
    } catch (error) {
      result.tests.connection = {
        passed: false,
        message: error instanceof Error ? error.message : "连接失败",
      };
      throw new Error("连接测试失败");
    }

    // 测试 2: 简单查询
    try {
      await db.$queryRaw`SELECT 1`;
      result.tests.simpleQuery = {
        passed: true,
        message: "简单查询成功",
      };
    } catch (error) {
      result.tests.simpleQuery = {
        passed: false,
        message: error instanceof Error ? error.message : "查询失败",
      };
      throw new Error("简单查询失败");
    }

    // 测试 3: 表结构检查
    try {
      const tables = await db.$queryRaw<{ tablename: string }[]>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `;
      result.tests.tableCount = {
        passed: true,
        message: `找到 ${tables.length} 个表`,
        count: tables.length,
      };
    } catch (error) {
      result.tests.tableCount = {
        passed: false,
        message: error instanceof Error ? error.message : "表检查失败",
      };
      throw new Error("表结构检查失败");
    }

    // 测试 4: 用户表查询
    try {
      const userCount = await db.user.count();
      result.tests.userCount = {
        passed: true,
        message: `用户数量: ${userCount}`,
        count: userCount,
      };
    } catch (error) {
      result.tests.userCount = {
        passed: false,
        message: error instanceof Error ? error.message : "用户查询失败",
      };
      throw new Error("用户表查询失败");
    }

    // 测试 5: 写入测试
    try {
      const testId = `test_${Date.now()}`;
      const testEmail = `test_${Date.now()}@test.com`;

      // 创建测试用户
      const user = await db.user.create({
        data: {
          id: testId,
          email: testEmail,
          name: "测试用户",
          hasCompletedOnboarding: false,
        },
      });

      // 验证创建
      const found = await db.user.findUnique({
        where: { id: testId },
      });

      if (!found) {
        throw new Error("创建的用户无法找到");
      }

      // 清理
      await db.user.delete({
        where: { id: testId },
      });

      result.tests.writeTest = {
        passed: true,
        message: "数据写入、读取和删除成功",
      };
    } catch (error) {
      result.tests.writeTest = {
        passed: false,
        message: error instanceof Error ? error.message : "写入测试失败",
      };
      throw new Error("写入测试失败");
    }

    // 所有测试通过
    result.success = true;
    res.status(200).json(result);
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : "未知错误";
    res.status(500).json(result);
  } finally {
    await db.$disconnect();
  }
}

