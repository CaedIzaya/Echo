import { db } from "~/server/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    const { identifier, answers } = req.body;

    if (!identifier || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: "请提供完整信息" });
    }

    // 查找用户
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { name: identifier },
        ],
      },
    });

    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }

    // TODO: 验证密保答案
    // 这里简化处理，实际应该：
    // 1. 从数据库读取recovery_questions
    // 2. 对每个答案进行hash+salt验证
    // 3. 限制重试次数
    
    // 暂时简化验证逻辑
    const isValid = true; // 实际应该验证答案hash

    if (!isValid) {
      return res.status(400).json({ error: "答案不正确" });
    }

    // 生成临时token（10分钟有效）
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

    // TODO: 将token存储到数据库或Redis，用于后续验证
    // 这里简化处理，实际应该存储token和过期时间

    res.status(200).json({
      success: true,
      token,
      email: user.email,
    });
  } catch (error) {
    console.error("验证密保问题失败:", error);
    res.status(500).json({ error: "验证失败" });
  }
}

