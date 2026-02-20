import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
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
    return res.status(401).json({ error: "未授权" });
  }

  try {
    const announcedLevelRaw = Number(req.body?.announcedLevel);
    if (!Number.isFinite(announcedLevelRaw)) {
      return res.status(400).json({ error: "无效等级" });
    }

    const announcedLevel = Math.max(1, Math.floor(announcedLevelRaw));
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        userLevel: true,
        lastAnnouncedLevel: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }

    const safeLevel = Math.min(announcedLevel, Math.max(1, user.userLevel));
    const nextLevel = Math.max(user.lastAnnouncedLevel ?? 1, safeLevel);

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: {
        lastAnnouncedLevel: nextLevel,
      },
      select: {
        lastAnnouncedLevel: true,
      },
    });

    return res.status(200).json({
      success: true,
      lastAnnouncedLevel: updated.lastAnnouncedLevel,
    });
  } catch (error: any) {
    console.error("[announce-level] 更新失败", {
      userId: session.user.id,
      error: error?.message || error,
    });
    return res.status(500).json({ error: "服务器错误" });
  }
}

