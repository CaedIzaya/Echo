import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ error: "未授权" });
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { hasCompletedNewUserGuide: true },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[complete-new-user-guide] 错误:", error);
    res.status(500).json({ success: false, error: "更新失败" });
  }
}
