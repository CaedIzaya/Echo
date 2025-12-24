import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
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
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ error: "未授权" });
    }

    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "请提供至少一个问题" });
    }

    // 清理旧密保问题（当前实现：每个用户仅保留最新一组问题）
    await db.recoveryQuestion.deleteMany({
      where: { userId: session.user.id },
    });

    // 处理每个问题：生成salt并hash答案（统一 trim + lowercase，降低输入大小写/空格导致误判）
    const created = await Promise.all(
      questions.map(async (q: { question: string; answer: string }) => {
        const question = String(q.question ?? "").trim();
        const answer = String(q.answer ?? "").trim();

        if (!question || !answer) {
          throw new Error("问题或答案不能为空");
        }

        const salt = crypto.randomBytes(16).toString("hex");
        const normalizedAnswer = answer.toLowerCase();
        const answerHash = await bcrypt.hash(normalizedAnswer + salt, 12);

        return db.recoveryQuestion.create({
          data: {
            userId: session.user.id,
            question,
            answerHash,
            salt,
          },
          select: { id: true, question: true, createdAt: true },
        });
      }),
    );

    res.status(200).json({
      success: true,
      message: "密保问题设置成功",
      questions: created,
    });
  } catch (error) {
    console.error("设置密保问题失败:", error);
    res.status(500).json({ error: "设置密保问题失败" });
  }
}

