import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "未授权" });
  }

  try {
    const achievements = await db.achievement.findMany({
      where: { userId: session.user.id },
      select: {
        achievementId: true,
        category: true,
        unlockedAt: true,
      },
      orderBy: { unlockedAt: "desc" },
    });

    return res.status(200).json({
      achievements: achievements.map((a) => ({
        id: a.achievementId,
        category: a.category,
        unlockedAt: a.unlockedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[achievements] 获取成就列表失败:", {
      userId: session.user.id,
      error: error?.message || error,
    });

    return res.status(500).json({ error: "服务器错误" });
  }
}














