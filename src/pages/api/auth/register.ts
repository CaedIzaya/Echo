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

  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "邮箱和密码必填" });
  }

  // 验证密码长度
  if (password.length < 8) {
    return res.status(400).json({ error: "密码至少需要8位字符" });
  }

  try {
    // 检查用户是否已存在
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "用户已存在" });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const user = await db.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        password: hashedPassword,
        name,
        hasCompletedOnboarding: false,
        updatedAt: new Date(),
      },
    });

    res.status(201).json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
      message: "注册成功" 
    });
  } catch (error) {
    console.error("注册错误:", error);
    res.status(500).json({ error: "注册失败" });
  }
}