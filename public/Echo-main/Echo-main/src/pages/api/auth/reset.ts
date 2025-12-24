import { db } from "~/server/db";
import bcrypt from "bcryptjs";
import { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

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

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await db.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { userId: true, expiresAt: true, usedAt: true },
    });

    if (!record) return res.status(400).json({ error: "链接无效或已过期" });
    if (record.usedAt) return res.status(400).json({ error: "链接已使用" });
    if (record.expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ error: "链接已过期" });
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 更新密码
    const updatedUser = await db.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
      select: { email: true },
    });

    await db.passwordResetToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: "密码重置成功",
      email: updatedUser.email,
    });
  } catch (error) {
    console.error("重置密码失败:", error);
    res.status(500).json({ error: "重置密码失败" });
  }
}

