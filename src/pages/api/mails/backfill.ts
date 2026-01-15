import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";

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

const BADGE_MAILS: Record<string, { title: string; content: (name: string, tree: string) => string; sender: string }> = {
  badge_bronze: {
    title: "一枚青铜勋章",
    sender: "Lumi & 心树",
    content: (name, tree) => `嗨，${name}
Lumi：
我记得你。
不是因为你做了多少，
而是你一次次回来。
有些人只路过，
而你选择停留。
心树：
时间在这里留下了最初的痕迹。
它不深，但真实。
青铜并不耀眼，
却足够证明一件事：
这段专注，发生过。
—— Lumi & ${tree}`,
  },
  badge_silver: {
    title: "白银的光，刚刚好",
    sender: "Lumi & 心树",
    content: (name, tree) => `嗨，${name}
Lumi：
我发现你越来越熟练了。
不是着急的那种，
而是知道什么时候该开始，什么时候可以停下。
我很安心。
心树：
年轮开始有了间距。
这意味着，
你不再被时间推着走。
白银的光不刺眼，
却足够照亮前方的一小段路。
—— Lumi & ${tree}`,
  },
  badge_gold: {
    title: "黄金不是为了闪耀",
    sender: "Lumi & 心树",
    content: (name, tree) => `嗨，${name}
Lumi：
你现在的状态，
已经不太需要我提醒了。
但我还是很高兴，
能在你身边。
心树：
当时间开始反复选择同一个方向，
重量就会自然出现。
黄金并非因为耀眼，
而是因为它足够稳定，
经得起沉默。
这枚勋章，
属于那些不声张，却持续生长的人。
—— Lumi & ${tree}`,
  },
  badge_diamond: {
    title: "来自 Echo 的敬意",
    sender: "Echo",
    content: (_name, _tree) => `嗨，
这一次，我想以一个更真实的身份与你说话。
我是 Echo 的开发者，Callum。
而你眼前的这枚钻石勋章，
意味着你已经陪伴 Echo 走过了一段非常长的时间。
十颗果实，不是偶然。
它代表的是反复的选择、安静的坚持，
以及一次次，把时间拿回自己手里的决定。
Lumi，
是我心中对童真、好奇、探索欲的保留。
那种即使长大了，也仍然想变得更好一点的念头。
心树，
则记录了你在专注中积累的一切。
但我想，此刻它们对你而言，
或许早已不只是一个设计。
这是我的第一件作品，
未来我会让 Lumi 更生动，也更有智慧，
让 Echo 成为一个真正值得陪伴的存在。
如果你愿意，
我也非常期待听见你的声音。
向你致敬，
也感谢你，把时间的一部分，交给了这里。
Callum`,
  },
};

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
    return res.status(401).json({ error: "未授权" });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        userLevel: true,
        heartTreeName: true,
        totalFruitsEarned: true,
        fruits: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }

    const today = formatYmd(new Date());
    const username = user.name || "旅行者";
    const treeName = user.heartTreeName || "心树";

    // 欢迎邮件
    await db.mail.upsert({
      where: { id: `welcome_${user.id}` },
      update: {},
      create: {
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
        date: today,
        sender: "Echo 团队",
        type: "system",
        isRead: false,
        isPermanent: true,
        actionUrl: "/profile/security-questions",
        actionLabel: "去设置密保",
      },
    });

    // 等级邮件
    const levelThresholds = [2, 5, 10, 20];
    for (const threshold of levelThresholds) {
      if (user.userLevel >= threshold) {
        const mail = LEVEL_MAILS[threshold];
        if (!mail) continue;
        await db.mail.upsert({
          where: { id: `level_${user.id}_${threshold}` },
          update: {},
          create: {
            id: `level_${user.id}_${threshold}`,
            userId: user.id,
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

    // 勋章邮件（基于购买记录）
    const purchases = await db.shopPurchase.findMany({
      where: { userId: user.id, itemType: "badge" },
      select: { itemId: true },
    });

    for (const purchase of purchases) {
      const template = BADGE_MAILS[purchase.itemId];
      if (!template) continue;
      await db.mail.upsert({
        where: { id: `badge_${user.id}_${purchase.itemId}` },
        update: {},
        create: {
          id: `badge_${user.id}_${purchase.itemId}`,
          userId: user.id,
          title: template.title,
          content: template.content(username, treeName),
          date: today,
          sender: template.sender,
          type: "notification",
          isRead: false,
          isPermanent: true,
        },
      });
    }

    // 果实邮件（累计）
    const totalFruits = user.totalFruitsEarned ?? user.fruits ?? 0;
    const fruitThresholds = [1, 5, 10];
    for (const threshold of fruitThresholds) {
      if (totalFruits >= threshold) {
        await db.mail.upsert({
          where: { id: `fruit_${user.id}_${threshold}` },
          update: {},
          create: {
            id: `fruit_${user.id}_${threshold}`,
            userId: user.id,
            title: buildFruitMailTitle(threshold, treeName),
            content: buildFruitMailContent(threshold, treeName),
            date: today,
            sender: treeName,
            type: "notification",
            isRead: false,
            isPermanent: true,
          },
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("[mails/backfill] 失败:", error);
    return res.status(500).json({ error: "服务器错误" });
  }
}

