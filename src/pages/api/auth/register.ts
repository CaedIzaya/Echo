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

    // 创建新手欢迎邮件（永久保存）
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    await db.mail.create({
      data: {
        id: `welcome_${user.id}`,
        userId: user.id,
        title: "欢迎来到 Echo Focus",
        content: `亲爱的旅人：

很高兴能在 Echo Focus 遇见你。

这是一个为你打造的专注空间，在这里，你可以：
1. 设定专注目标，进入心流状态
2. 种植你的心树，见证自我成长
3. 完成里程碑，记录每一个进步的瞬间

重要提醒（建议尽快完成）：
请前往「个人中心 → 账号安全 → 设置密保问题」完成密保设置。
这会帮助你在忘记密码时，随时回到 Echo。

如果暂时还不确定怎么用 Echo，可以在仪表盘点击右上角的 🔍，打开「使用指南」查看详细说明。

愿你在这里找回内心的平静与力量。

Echo 团队
敬上`,
        date: dateStr,
        sender: "Echo 团队",
        type: "system",
        isRead: false,
        isPermanent: true,
        actionUrl: "/profile/security-questions",
        actionLabel: "去设置密保",
        expiresAt: null,
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