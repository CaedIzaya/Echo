import { PrismaClient } from "@prisma/client";

// 连接重试函数
const connectWithRetry = async (prisma: PrismaClient, retries = 3): Promise<void> => {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      return;
    } catch (error: unknown) {
      const err = error as { kind?: string; code?: string };
      if (i === retries - 1) {
        console.error(`[Prisma] 连接失败，已重试 ${retries} 次:`, err);
        throw error;
      }
      // 如果是连接关闭错误，等待后重试
      if (err.kind === "Closed" || err.code === "P1001") {
        console.warn(`[Prisma] 连接已关闭，${i + 1}/${retries} 次重试...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
};

const createPrismaClient = () => {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // 添加连接健康检查
  const checkConnection = async () => {
    try {
      await client.$queryRaw`SELECT 1`;
    } catch (error) {
      console.warn("[Prisma] 连接健康检查失败，尝试重连...");
      try {
        await client.$disconnect();
        await connectWithRetry(client);
      } catch (retryError) {
        console.error("[Prisma] 重连失败:", retryError);
      }
    }
  };

  // 定期健康检查
  // - 生产环境：每5分钟检查一次
  // - 开发环境：每10分钟检查一次（减少日志噪音）
  if (typeof process !== "undefined") {
    const interval = process.env.NODE_ENV === "production" 
      ? 5 * 60 * 1000  // 5分钟
      : 10 * 60 * 1000; // 10分钟
    
    const intervalId = setInterval(() => {
      checkConnection().catch((err) => {
        console.error("[Prisma] 健康检查出错:", err);
      });
    }, interval);
    
    // 清理定时器
    process.on('beforeExit', () => {
      clearInterval(intervalId);
    });
  }

  return client;
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

// Prisma Client 使用懒连接，不需要在初始化时显式连接
// 连接会在第一次查询时自动建立

// 生产环境下监听进程退出，优雅断开连接
if (process.env.NODE_ENV === "production") {
  const cleanup = async () => {
    try {
      await db.$disconnect();
    } catch (error) {
      console.error("[Prisma] 断开连接时出错:", error);
    }
  };
  
  process.on('beforeExit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
