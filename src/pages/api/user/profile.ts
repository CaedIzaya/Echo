import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: "未授权" });
  }

  // GET - 获取用户资料
  if (req.method === "GET") {
    try {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
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
        bio: user.bio,
        // level和title由前端从localStorage计算，不在这里返回
      });
    } catch (error) {
      console.error("获取用户资料失败:", error);
      res.status(500).json({ error: "获取用户资料失败" });
    }
    return;
  }

  // PUT - 更新用户资料
  if (req.method === "PUT") {
    try {
      const { name, bio } = req.body;

      // 验证输入
      if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
        return res.status(400).json({ error: "昵称不能为空" });
      }

      if (bio !== undefined && typeof bio !== 'string') {
        return res.status(400).json({ error: "个性签名格式不正确" });
      }

      if (bio && bio.length > 100) {
        return res.status(400).json({ error: "个性签名不能超过100个字符" });
      }

      // 构建更新数据
      const updateData: { name?: string; bio?: string } = {};
      if (name !== undefined) updateData.name = name.trim();
      if (bio !== undefined) updateData.bio = bio.trim();

      // 更新用户资料
      const updatedUser = await db.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          createdAt: true,
        },
      });

      res.status(200).json({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        emailVerified: false,
        image: updatedUser.image,
        createdAt: updatedUser.createdAt.toISOString(),
        bio: updatedUser.bio,
      });
    } catch (error) {
      console.error("更新用户资料失败:", error);
      res.status(500).json({ error: "更新用户资料失败" });
    }
    return;
  }

  return res.status(405).json({ error: "方法不允许" });
}

