import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";
import { decodeProjectDescription } from "~/lib/projectMeta";
import {
  deleteMicroGoalHistoryItem,
  getMicroGoalHistory,
  renameMicroGoalHistoryItem,
} from "~/lib/microGoalHistory";
import { buildMicroGoalInspirations } from "~/lib/microGoalSuggestions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "未授权" });
  }

  const userId = session.user.id;

  try {
    if (req.method === "GET") {
      const history = await getMicroGoalHistory(userId, 8);
      const primaryPlan = await db.project.findFirst({
        where: {
          userId,
          isPrimary: true,
          isActive: true,
        },
        select: {
          name: true,
          description: true,
        },
      });

      const planMeta = decodeProjectDescription(primaryPlan?.description ?? "");
      const inspirations = buildMicroGoalInspirations({
        historyRecent: history.recent.map((item) => item.text),
        historyFrequent: history.frequent.map((item) => item.text),
        context: {
          planName: primaryPlan?.name,
          focusBranch: planMeta.focusBranch,
          focusDetail: planMeta.focusDetail,
        },
        count: 5,
      });

      return res.status(200).json({
        recent: history.recent,
        frequent: history.frequent,
        inspirations,
        total: history.total,
      });
    }

    if (req.method === "PATCH") {
      const { itemId, text } = req.body as { itemId?: string; text?: string };
      if (!itemId || !text) {
        return res.status(400).json({ error: "缺少必要参数" });
      }

      let updated = null;
      try {
        updated = await renameMicroGoalHistoryItem(userId, itemId, text);
      } catch (error: any) {
        if (error?.message === "NOT_FOUND") {
          return res.status(404).json({ error: "记录不存在" });
        }
        throw error;
      }
      return res.status(200).json({ item: updated });
    }

    if (req.method === "DELETE") {
      const itemId = req.query.itemId;
      if (typeof itemId !== "string" || !itemId) {
        return res.status(400).json({ error: "缺少 itemId" });
      }

      await deleteMicroGoalHistoryItem(userId, itemId);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "方法不允许" });
  } catch (error: any) {
    console.error("[micro-goals/history] 操作失败:", error);
    return res.status(500).json({
      error: "服务器错误",
      message: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
}

