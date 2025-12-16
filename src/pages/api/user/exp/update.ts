import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { db } from "~/server/db";
import { LevelManager } from "~/lib/LevelSystem";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    console.warn("[user-exp] 未授权访问尝试");
    return res.status(401).json({ error: "未授权" });
  }

  try {
    const { userExp } = req.body;

    // 验证经验值
    if (typeof userExp !== "number" || userExp < 0) {
      return res.status(400).json({ error: "无效的经验值" });
    }

    if (userExp > 10000000) {
      return res.status(400).json({ error: "经验值超出范围" });
    }

    // 计算等级
    const levelInfo = LevelManager.calculateLevel(userExp);

    console.log(`[user-exp] 更新用户经验: userId=${session.user.id}, exp=${userExp}, level=${levelInfo.level}`);

    // 更新数据库
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        userExp,
        userLevel: levelInfo.level,
      },
      select: {
        userExp: true,
        userLevel: true,
      },
    });

    console.log(`[user-exp] 用户经验更新成功: exp=${updatedUser.userExp}, level=${updatedUser.userLevel}`);

    return res.status(200).json({
      success: true,
      userExp: updatedUser.userExp,
      userLevel: updatedUser.userLevel,
    });
  } catch (error: any) {
    console.error("[user-exp] 更新用户经验失败:", {
      userId: session.user.id,
      error: error?.message || error,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: "服务器错误",
      message:
        process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
}

