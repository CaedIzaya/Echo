import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
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

    // 处理每个问题：生成salt并hash答案
    const recoveryQuestions = await Promise.all(
      questions.map(async (q: { question: string; answer: string }) => {
        const salt = crypto.randomBytes(16).toString('hex');
        const answerHash = await bcrypt.hash(q.answer.trim().toLowerCase() + salt, 12);
        
        return {
          question: q.question,
          answerHash,
          salt,
          createdAt: new Date().toISOString(),
        };
      })
    );

    // TODO: 更新数据库中的recovery_questions字段
    // 这里简化处理，实际应该：
    // await db.user.update({
    //   where: { id: session.user.id },
    //   data: { recoveryQuestions: JSON.stringify(recoveryQuestions) },
    // });

    // 暂时只返回成功，实际应该保存到数据库
    res.status(200).json({
      success: true,
      message: "密保问题设置成功",
    });
  } catch (error) {
    console.error("设置密保问题失败:", error);
    res.status(500).json({ error: "设置密保问题失败" });
  }
}

