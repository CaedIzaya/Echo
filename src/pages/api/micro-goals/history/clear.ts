import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { clearMicroGoalHistory } from "~/lib/microGoalHistory";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "未授权" });
  }

  try {
    await clearMicroGoalHistory(session.user.id);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("[micro-goals/history/clear] 清空失败:", error);
    return res.status(500).json({
      error: "服务器错误",
      message: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
}

