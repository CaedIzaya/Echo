// 测试 Prisma 客户端中的 focusSession 模型
import { db } from "./src/server/db";

// 测试 focusSession 模型是否可用
const testFocusSession = async () => {
  try {
    // 尝试访问 focusSession 模型
    const sessions = await db.focusSession.findMany();
    console.log("focusSession 模型可用");
    return sessions;
  } catch (error) {
    console.error("focusSession 模型不可用:", error);
    throw error;
  }
};

export { testFocusSession };
