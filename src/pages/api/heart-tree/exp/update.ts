import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { db } from "~/server/db";
import { HEART_TREE_MAX_LEVEL } from "~/lib/HeartTreeExpSystem";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    console.warn("[heart-tree-exp] 未授权访问尝试");
    return res.status(401).json({ error: "未授权" });
  }

  try {
    const {
      level,
      currentExp,
      totalExp,
      lastWateredDate,
      fertilizerBuff,
    } = req.body;

    // 验证数据
    if (typeof level !== "number" || level < 1 || level > HEART_TREE_MAX_LEVEL) {
      return res.status(400).json({ error: "无效的等级" });
    }

    if (typeof currentExp !== "number" || currentExp < 0) {
      return res.status(400).json({ error: "无效的当前经验值" });
    }

    if (typeof totalExp !== "number" || totalExp < 0) {
      return res.status(400).json({ error: "无效的总经验值" });
    }

    console.log(`[heart-tree-exp] 更新心树经验: userId=${session.user.id}, level=${level}, totalExp=${totalExp}`);

    // 更新数据库
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        heartTreeLevel: level,
        heartTreeCurrentExp: currentExp,
        heartTreeTotalExp: totalExp,
        lastWateredDate: lastWateredDate || null,
        fertilizerExpiresAt: fertilizerBuff?.expiresAt
          ? new Date(fertilizerBuff.expiresAt)
          : null,
        fertilizerMultiplier: fertilizerBuff?.multiplier || null,
      },
      select: {
        heartTreeLevel: true,
        heartTreeCurrentExp: true,
        heartTreeTotalExp: true,
      },
    });

    console.log(`[heart-tree-exp] 心树经验更新成功: level=${updatedUser.heartTreeLevel}`);

    return res.status(200).json({
      success: true,
      level: updatedUser.heartTreeLevel,
      currentExp: updatedUser.heartTreeCurrentExp,
      totalExp: updatedUser.heartTreeTotalExp,
    });
  } catch (error: any) {
    console.error("[heart-tree-exp] 更新心树经验失败:", {
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














