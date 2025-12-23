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
    console.warn("[heart-tree] 未授权访问尝试");
    return res.status(401).json({ error: "未授权" });
  }

  try {
    const { name } = req.body;

    // 验证名字
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "心树名字必填" });
    }

    if (name.length > 20) {
      return res.status(400).json({ error: "心树名字不能超过20个字符" });
    }

    if (name.trim().length === 0) {
      return res.status(400).json({ error: "心树名字不能为空" });
    }

    console.log(`[heart-tree] 更新心树名字: userId=${session.user.id}, name=${name}`);

    // 更新数据库
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { heartTreeName: name.trim() },
      select: { heartTreeName: true },
    });

    console.log(`[heart-tree] 心树名字更新成功: ${updatedUser.heartTreeName}`);

    return res.status(200).json({
      success: true,
      heartTreeName: updatedUser.heartTreeName,
    });
  } catch (error: any) {
    console.error("[heart-tree] 更新心树名字失败:", {
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












