import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";
import bcrypt from "bcryptjs";
import { NextApiRequest, NextApiResponse } from "next";

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

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "请填写所有字段" });
    }

    // 验证新密码长度
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "密码至少需要8位字符" });
    }

    // 获取用户信息
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user || !user.password) {
      return res.status(404).json({ error: "用户不存在或未设置密码" });
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(400).json({ error: "旧密码不正确" });
    }

    // 检查新密码是否与旧密码相同
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ error: "新密码不能与旧密码相同" });
    }

    // 哈希新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // 更新密码
    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashedNewPassword },
    });

    res.status(200).json({
      success: true,
      message: "密码修改成功",
    });
  } catch (error) {
    console.error("修改密码失败:", error);
    res.status(500).json({ error: "修改密码失败" });
  }
}

