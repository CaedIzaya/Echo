import { db } from "~/server/db";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: "请输入邮箱或用户名" });
    }

    // 查找用户（通过邮箱或用户名）
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { name: identifier },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "未找到该账户" });
    }

    // TODO: 从数据库读取密保问题
    // 这里简化处理，实际应该从user的recovery_questions字段读取
    // 暂时返回示例问题
    const questions = [
      {
        id: 'q1',
        question: '当初点亮你专注之火的那个契机是什么？',
        type: 'memory',
      },
    ];

    res.status(200).json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error("找回密码失败:", error);
    res.status(500).json({ error: "找回密码失败" });
  }
}























