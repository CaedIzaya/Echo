import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  console.log("=== 开始处理 complete-onboarding 请求 ===");

  try {
    const session = await getServerSession(req, res, authOptions);
    console.log("Session 信息:", session);

    if (!session?.user?.id) {
      console.log("未找到用户会话");
      return res.status(401).json({ error: "未授权" });
    }

    console.log("用户ID:", session.user.id);

    // 检查用户是否存在
    const existingUser = await db.user.findUnique({
      where: { id: session.user.id }
    });

    if (!existingUser) {
      console.log("数据库中没有找到对应用户");
      return res.status(404).json({ error: "用户不存在" });
    }

    console.log("找到用户:", existingUser.email);

    // 更新用户状态
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { hasCompletedOnboarding: true },
    });

    console.log("用户更新成功:", updatedUser.hasCompletedOnboarding);

    res.status(200).json({ 
      success: true,
      message: "Onboarding 完成",
      hasCompletedOnboarding: updatedUser.hasCompletedOnboarding
    });

  } catch (error) {
    console.error("complete-onboarding 错误详情:", error);
    
    // 提供更详细的错误信息
    let errorMessage = "更新失败";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("错误堆栈:", error.stack);
    }

    res.status(500).json({ 
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}