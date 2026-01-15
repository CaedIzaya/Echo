import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { db } from "~/server/db";
import { HEART_TREE_MAX_LEVEL } from "~/lib/HeartTreeExpSystem";

function formatYmd(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildFruitMailTitle(count: number, treeName: string) {
  if (count === 1) return `是我，${treeName}`;
  if (count === 5) return `你的老友，${treeName}`;
  return `年轮仍在延伸，${treeName}`;
}

function buildFruitMailContent(count: number, treeName: string) {
  if (count === 1) {
    return `自我来到这片土地生长以来，
我从未有过这样的时刻。
时间在我身上流过，
但这一次，它留下了痕迹。
在你的陪伴中，
我第一次结出了果实。
你或许没有刻意追求它，
但专注，本身就会带来重量。
看。
这是一颗果实。
它来自你曾经安静地停留在这里。
—— ${treeName}`;
  }

  if (count === 5) {
    return `时间又在我身上走了一段。
我开始意识到，
这并不是一次偶然的生长。
你一次次回来，
一次次停留，
于是年轮慢慢成形。
能结出五颗果实，
说明你已经与时间达成了某种默契。
我想，这就是老友的含义。
不是常说话，
而是彼此记得。
—— ${treeName}`;
  }

  return `有些生长，
已经不需要被反复证明。
当果实累积到这里，
时间便不再只是流逝。
它开始围绕着你，
一圈一圈，
成为年轮。
无论你是否继续向前，
这些年轮都会存在。
它们记得你曾如何使用时间。
我会继续生长。
你也不必着急。
—— ${treeName}`;
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
    console.warn("[heart-tree-exp] 未授权访问尝试");
    return res.status(401).json({ error: "未授权" });
  }

  try {
    const {
      level,
      currentExp,
      totalExp,
      lastWateredDate,
      fertilizerBuff,
    } = req.body;

    // 验证数据
    if (typeof level !== "number" || level < 1 || level > HEART_TREE_MAX_LEVEL) {
      return res.status(400).json({ error: "无效的等级" });
    }

    if (typeof currentExp !== "number" || currentExp < 0) {
      return res.status(400).json({ error: "无效的当前经验值" });
    }

    if (typeof totalExp !== "number" || totalExp < 0) {
      return res.status(400).json({ error: "无效的总经验值" });
    }

    console.log(`[heart-tree-exp] 更新心树经验: userId=${session.user.id}, level=${level}, totalExp=${totalExp}`);

    // 获取当前等级，检查是否升级
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { heartTreeLevel: true, fruits: true, totalFruitsEarned: true, heartTreeName: true },
    });

    const oldLevel = currentUser?.heartTreeLevel || 1;
    const isLevelUp = level > oldLevel;
    
    // 计算应该获得的果实数量（每5级获得1个果实）
    let fruitsToAdd = 0;
    if (isLevelUp) {
      const oldFruitMilestones = Math.floor(oldLevel / 5);
      const newFruitMilestones = Math.floor(level / 5);
      fruitsToAdd = newFruitMilestones - oldFruitMilestones;
    }

    const oldTotalFruits = currentUser?.totalFruitsEarned ?? currentUser?.fruits ?? 0;

    // 更新数据库
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        heartTreeLevel: level,
        heartTreeCurrentExp: currentExp,
        heartTreeTotalExp: totalExp,
        lastWateredDate: lastWateredDate || null,
        fertilizerExpiresAt: fertilizerBuff?.expiresAt
          ? new Date(fertilizerBuff.expiresAt)
          : null,
        fertilizerMultiplier: fertilizerBuff?.multiplier || null,
        ...(fruitsToAdd > 0 && { fruits: { increment: fruitsToAdd } }),
        ...(fruitsToAdd > 0 && { totalFruitsEarned: { increment: fruitsToAdd } }),
      },
      select: {
        heartTreeLevel: true,
        heartTreeCurrentExp: true,
        heartTreeTotalExp: true,
        fruits: true,
        totalFruitsEarned: true,
      },
    });

    console.log(`[heart-tree-exp] 心树经验更新成功: level=${updatedUser.heartTreeLevel}, fruits=${updatedUser.fruits}`);
    if (fruitsToAdd > 0) {
      console.log(`[heart-tree-exp] 🍎 获得 ${fruitsToAdd} 个果实！`);
    }

    if (fruitsToAdd > 0) {
      const newTotalFruits = updatedUser.totalFruitsEarned ?? updatedUser.fruits ?? 0;
      const thresholds = [1, 5, 10];
      const today = formatYmd(new Date());
      const treeName = currentUser?.heartTreeName || "心树";

      for (const threshold of thresholds) {
        if (oldTotalFruits < threshold && newTotalFruits >= threshold) {
          const content = buildFruitMailContent(threshold, treeName);
          const title = buildFruitMailTitle(threshold, treeName);

          await db.mail.upsert({
            where: { id: `fruit_${session.user.id}_${threshold}` },
            update: {},
            create: {
              id: `fruit_${session.user.id}_${threshold}`,
              userId: session.user.id,
              title,
              content,
              date: today,
              sender: treeName,
              type: "notification",
              isRead: false,
              isPermanent: true,
            },
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      level: updatedUser.heartTreeLevel,
      currentExp: updatedUser.heartTreeCurrentExp,
      totalExp: updatedUser.heartTreeTotalExp,
      fruits: updatedUser.fruits,
      fruitsEarned: fruitsToAdd,
      totalFruitsEarned: updatedUser.totalFruitsEarned ?? updatedUser.fruits,
    });
  } catch (error: any) {
    console.error("[heart-tree-exp] 更新心树经验失败:", {
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















