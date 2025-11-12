import { db } from "~/server/db";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "请提供完整信息" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "两次输入的密码不一致" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "密码至少需要8位字符" });
    }

    // TODO: 验证token是否有效且未过期
    // 这里简化处理，实际应该：
    // 1. 从数据库或Redis查找token
    // 2. 验证token是否过期
    // 3. 获取关联的用户ID

    // 暂时通过session获取用户（实际应该通过token）
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: "未授权" });
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 更新密码
    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    // TODO: 删除已使用的token

    res.status(200).json({
      success: true,
      message: "密码重置成功",
      email: session.user.email,
    });
  } catch (error) {
    console.error("重置密码失败:", error);
    res.status(500).json({ error: "重置密码失败" });
  }
}

