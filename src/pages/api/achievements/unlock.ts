import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    console.warn("[achievements] 未授权访问尝试");
    return res.status(401).json({ error: "未授权" });
  }

  try {
    const { achievementId, category } = req.body;

    // 验证数据
    if (!achievementId || typeof achievementId !== "string") {
      return res.status(400).json({ error: "无效的成就ID" });
    }

    if (!category || typeof category !== "string") {
      return res.status(400).json({ error: "无效的成就类别" });
    }

    console.log(`[achievements] 解锁成就: userId=${session.user.id}, achievementId=${achievementId}`);

    // 检查是否已解锁
    const existing = await db.achievement.findUnique({
      where: {
        userId_achievementId: {
          userId: session.user.id,
          achievementId,
        },
      },
    });

    if (existing) {
      console.log(`[achievements] 成就已解锁: ${achievementId}`);
      return res.status(200).json({
        success: true,
        alreadyUnlocked: true,
        achievement: {
          id: existing.achievementId,
          category: existing.category,
          unlockedAt: existing.unlockedAt.toISOString(),
        },
      });
    }

    // 解锁新成就
    const achievement = await db.achievement.create({
      data: {
        userId: session.user.id,
        achievementId,
        category,
      },
    });

    console.log(`[achievements] 成就解锁成功: ${achievementId}`);

    return res.status(200).json({
      success: true,
      alreadyUnlocked: false,
      achievement: {
        id: achievement.achievementId,
        category: achievement.category,
        unlockedAt: achievement.unlockedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[achievements] 解锁成就失败:", {
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







