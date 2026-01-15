import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';

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
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { itemId, itemType, price } = req.body;

    if (!itemId || !itemType || typeof price !== 'number') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // 检查用户果实余额
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { fruits: true, name: true, heartTreeName: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.fruits < price) {
      return res.status(400).json({ error: '果实不足' });
    }

    // 检查是否已购买
    const existingPurchase = await db.shopPurchase.findFirst({
      where: {
        userId: session.user.id,
        itemId,
      },
    });

    if (existingPurchase) {
      return res.status(400).json({ error: '已购买该商品' });
    }

    // 执行购买：扣除果实并记录购买
    await db.$transaction([
      db.user.update({
        where: { id: session.user.id },
        data: { fruits: { decrement: price } },
      }),
      db.shopPurchase.create({
        data: {
          userId: session.user.id,
          itemId,
          itemType,
          price,
        },
      }),
    ]);

    // 返回更新后的果实余额
    const updatedUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { fruits: true },
    });

    if (itemType === 'badge' && BADGE_MAILS[itemId]) {
      const today = formatYmd(new Date());
      const username = user?.name || '旅行者';
      const treeName = user?.heartTreeName || '心树';
      const template = BADGE_MAILS[itemId];
      await db.mail.upsert({
        where: { id: `badge_${session.user.id}_${itemId}` },
        update: {},
        create: {
          id: `badge_${session.user.id}_${itemId}`,
          userId: session.user.id,
          title: template.title,
          content: template.content(username, treeName),
          date: today,
          sender: template.sender,
          type: 'notification',
          isRead: false,
          isPermanent: true,
        },
      });
    }

    return res.status(200).json({ 
      success: true,
      fruits: updatedUser?.fruits || 0,
    });
  } catch (error) {
    console.error('购买商品失败:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

