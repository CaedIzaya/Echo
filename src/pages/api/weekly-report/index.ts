import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { computeWeeklyReport } from "~/lib/weeklyReport";

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

  const weekStartParam = req.query.weekStart as string | undefined;
  const preview = req.query.preview === "true";

  try {
    const report = await computeWeeklyReport(session.user.id, {
      referenceDate: weekStartParam ? new Date(weekStartParam) : undefined,
      persist: !preview,
    });
    return res.status(200).json({ report });
  } catch (error) {
    console.error("获取周报失败", error);
    return res.status(500).json({ error: "服务器错误" });
  }
}

