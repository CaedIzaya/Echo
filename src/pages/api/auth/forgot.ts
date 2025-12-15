import { db } from "~/server/db";
import { NextApiRequest, NextApiResponse } from "next";

const ADMIN_EMAIL = "Caedmon_Izaya@outlook.com";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: "请输入邮箱或用户名" });
    }

    // 查找用户（通过邮箱或用户名）
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { name: identifier },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "未找到该账户" });
    }

    const recoveryQuestions = await db.recoveryQuestion.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, question: true },
    });

    if (recoveryQuestions.length === 0) {
      return res.status(200).json({
        success: true,
        mode: "admin",
        adminEmail: ADMIN_EMAIL,
        message:
          "该账户尚未设置密保问题。当前版本暂不支持邮箱验证码找回，请联系管理员协助。",
      });
    }

    return res.status(200).json({
      success: true,
      mode: "questions",
      questions: recoveryQuestions.map((q) => ({
        id: q.id,
        question: q.question,
      })),
    });
  } catch (error: any) {
    console.error("找回密码失败:", error);
    
    // 检查是否是数据库连接错误
    const errorMessage = error?.message || String(error);
    const isDatabaseError = 
      errorMessage.includes("datasource") ||
      errorMessage.includes("DATABASE_URL") ||
      errorMessage.includes("file:") ||
      errorMessage.includes("prisma") ||
      errorMessage.includes("connection");
    
    if (isDatabaseError) {
      // 数据库连接失败，提示联系管理员
      return res.status(200).json({
        success: true,
        mode: "admin",
        adminEmail: ADMIN_EMAIL,
        message:
          "系统暂时无法访问数据库。请联系管理员协助找回密码。",
      });
    }
    
    res.status(500).json({ error: "找回密码失败" });
  }
}




























