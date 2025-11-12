import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ error: "未授权" });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        hasCompletedOnboarding: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }

    // 注意：用户等级和称号是从客户端localStorage计算的
    // 这里只返回基础用户信息，等级信息由前端从localStorage读取并计算
    // 因为等级系统是基于客户端的经验值系统

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: false, // TODO: 从数据库读取emailVerified字段
      image: user.image,
      createdAt: user.createdAt.toISOString(),
      bio: null, // TODO: 从数据库读取bio字段
      // level和title由前端从localStorage计算，不在这里返回
    });
  } catch (error) {
    console.error("获取用户资料失败:", error);
    res.status(500).json({ error: "获取用户资料失败" });
  }
}

