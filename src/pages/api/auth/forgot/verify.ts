import { db } from "~/server/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextApiRequest, NextApiResponse } from "next";

// 注意：此文件在 forgot 子目录中，不需要导入 authOptions

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

    const storedQuestions = await db.recoveryQuestion.findMany({
      where: { userId: user.id },
      select: { id: true, answerHash: true, salt: true },
    });

    if (storedQuestions.length === 0) {
      return res.status(400).json({ error: "该账户未设置密保问题" });
    }

    const answerMap = new Map<string, string>();
    answers.forEach((a: { questionId: string; answer: string }) => {
      if (a?.questionId) answerMap.set(a.questionId, String(a.answer ?? ""));
    });

    // 要求：所有已存问题都必须回答
    const checks = await Promise.all(
      storedQuestions.map(async (q) => {
        const raw = answerMap.get(q.id);
        if (!raw) return false;
        const normalized = raw.trim().toLowerCase();
        return bcrypt.compare(normalized + q.salt, q.answerHash);
      }),
    );

    const isValid = checks.every(Boolean);
    if (!isValid) return res.status(400).json({ error: "答案不正确" });

    // 生成临时token（10分钟有效）
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

    // 将 token 存到数据库（只存 hash，避免明文泄漏）
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

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

