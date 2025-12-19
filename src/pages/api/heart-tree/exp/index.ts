import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
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
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        heartTreeLevel: true,
        heartTreeCurrentExp: true,
        heartTreeTotalExp: true,
        lastWateredDate: true,
        fertilizerExpiresAt: true,
        fertilizerMultiplier: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }

    return res.status(200).json({
      level: user.heartTreeLevel,
      currentExp: user.heartTreeCurrentExp,
      totalExp: user.heartTreeTotalExp,
      lastWateredDate: user.lastWateredDate,
      fertilizerBuff: user.fertilizerExpiresAt
        ? {
            expiresAt: user.fertilizerExpiresAt.toISOString(),
            multiplier: user.fertilizerMultiplier || 1.3,
          }
        : undefined,
    });
  } catch (error: any) {
    console.error("[heart-tree-exp] 获取心树经验失败:", {
      userId: session.user.id,
      error: error?.message || error,
    });

    return res.status(500).json({ error: "服务器错误" });
  }
}




