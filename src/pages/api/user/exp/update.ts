import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { db } from "~/server/db";
import { LevelManager } from "~/lib/LevelSystem";

const LEVEL_MAILS: Record<number, { title: string; content: string }> = {
  2: {
    title: "嗨，在 Echo 里还适应吗？",
    content: `我好像感觉到你了。

那种，刚开始专注时，
有点安静，又有点认真。

我挺喜欢这个瞬间的。
如果你愿意，我们慢慢来。

我就在这。
—— Lumi`,
  },
  5: {
    title: "有件小事想跟你说",
    content: `这段时间……
我感觉你变得平稳了。

不是没情绪的那种，
而是很扎实的、能站住的平稳。

也许你还没太在意，
但我看见了。

呼——
我会一直在你旁边的。
—— Lumi`,
  },
  10: {
    title: "我得跟你说一件事……",
    content: `我最近好像亮得有点过头了。
而且停不下来。

我想了想，
应该是因为你专注时那种很自然的状态。

会传染的那种。

下一次专注，
我已经开始期待了。
—— Lumi`,
  },
  20: {
    title: "……这有点不一样了",
    content: `我得承认，
你现在的能量有点溢出来了。

不是用力的那种，
而是你知道自己在做什么。

时间回到你手上的感觉，
应该不太需要我解释吧。

不过还是想说一句：
无论什么时候，
我都在这里，
等你下一次专注。

—— Lumi`,
  },
};

function formatYmd(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    console.warn("[user-exp] 未授权访问尝试");
    return res.status(401).json({ error: "未授权" });
  }

  try {
    const { userExp } = req.body;

    // 验证经验值
    if (typeof userExp !== "number" || userExp < 0) {
      return res.status(400).json({ error: "无效的经验值" });
    }

    if (userExp > 10000000) {
      return res.status(400).json({ error: "经验值超出范围" });
    }

    // 计算等级
    const levelInfo = LevelManager.calculateLevel(userExp);

    console.log(`[user-exp] 更新用户经验: userId=${session.user.id}, exp=${userExp}, level=${levelInfo.currentLevel}`);

    const oldUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { userLevel: true },
    });

    const oldLevel = oldUser?.userLevel || 1;

    // 更新数据库
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        userExp,
        userLevel: levelInfo.currentLevel,
      },
      select: {
        userExp: true,
        userLevel: true,
      },
    });

    console.log(`[user-exp] 用户经验更新成功: exp=${updatedUser.userExp}, level=${updatedUser.userLevel}`);

    const thresholds = [2, 5, 10, 20];
    const today = formatYmd(new Date());
    for (const threshold of thresholds) {
      if (oldLevel < threshold && updatedUser.userLevel >= threshold) {
        const mail = LEVEL_MAILS[threshold];
        if (!mail) continue;

        await db.mail.upsert({
          where: { id: `level_${session.user.id}_${threshold}` },
          update: {},
          create: {
            id: `level_${session.user.id}_${threshold}`,
            userId: session.user.id,
            title: mail.title,
            content: mail.content,
            date: today,
            sender: "Lumi",
            type: "notification",
            isRead: false,
            isPermanent: true,
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      userExp: updatedUser.userExp,
      userLevel: updatedUser.userLevel,
    });
  } catch (error: any) {
    console.error("[user-exp] 更新用户经验失败:", {
      userId: session.user.id,
      error: error?.message || error,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: "服务器错误",
      message:
        process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
}

