import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: "未授权" });
  }

  if (req.method === "GET") {
    try {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          lastWelcomeDate: true,
          lastPeriodicSpiritAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }

      return res.status(200).json({
        lastWelcomeDate: user.lastWelcomeDate ?? null,
        lastPeriodicSpiritAt: user.lastPeriodicSpiritAt
          ? user.lastPeriodicSpiritAt.toISOString()
          : null,
      });
    } catch (error) {
      console.error("[spirit-dialog] 获取失败:", error);
      return res.status(500).json({ error: "获取失败" });
    }
  }

  if (req.method === "PUT") {
    try {
      const { lastWelcomeDate, lastPeriodicSpiritAt } = req.body ?? {};

      const updateData: {
        lastWelcomeDate?: string | null;
        lastPeriodicSpiritAt?: Date | null;
      } = {};

      if (lastWelcomeDate !== undefined) {
        if (lastWelcomeDate !== null && (typeof lastWelcomeDate !== "string" || !isValidDateString(lastWelcomeDate))) {
          return res.status(400).json({ error: "lastWelcomeDate 格式不正确" });
        }
        updateData.lastWelcomeDate = lastWelcomeDate;
      }

      if (lastPeriodicSpiritAt !== undefined) {
        if (lastPeriodicSpiritAt !== null && typeof lastPeriodicSpiritAt !== "string") {
          return res.status(400).json({ error: "lastPeriodicSpiritAt 格式不正确" });
        }
        updateData.lastPeriodicSpiritAt = lastPeriodicSpiritAt
          ? new Date(lastPeriodicSpiritAt)
          : null;
      }

      const updated = await db.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
          lastWelcomeDate: true,
          lastPeriodicSpiritAt: true,
        },
      });

      return res.status(200).json({
        lastWelcomeDate: updated.lastWelcomeDate ?? null,
        lastPeriodicSpiritAt: updated.lastPeriodicSpiritAt
          ? updated.lastPeriodicSpiritAt.toISOString()
          : null,
      });
    } catch (error) {
      console.error("[spirit-dialog] 更新失败:", error);
      return res.status(500).json({ error: "更新失败" });
    }
  }

  return res.status(405).json({ error: "方法不允许" });
}
