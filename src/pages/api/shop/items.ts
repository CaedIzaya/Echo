import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'theme' | 'badge';
  price: number;
  purchased?: boolean;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'theme_echo',
    name: 'Echo基调',
    description: '专属的蓝绿色调，清新而富有生机',
    icon: '🌊',
    type: 'theme',
    price: 1,
  },
  {
    id: 'theme_salt_blue',
    name: '海盐淡蓝',
    description: '如香水般淡雅的蓝色，宁静而优雅',
    icon: '💠',
    type: 'theme',
    price: 1,
  },
  {
    id: 'theme_fresh_green',
    name: '生机嫩绿',
    description: '清新的绿色基调，充满自然的活力',
    icon: '🌿',
    type: 'theme',
    price: 1,
  },
  {
    id: 'theme_spring',
    name: '盎然春意',
    description: '生机绿色渐变，带少许落叶飘落',
    icon: '🌱',
    type: 'theme',
    price: 2,
  },
  {
    id: 'theme_summer',
    name: '炎炎夏日',
    description: '深蓝色渐变，蓝色泡泡缓缓上升',
    icon: '🌊',
    type: 'theme',
    price: 2,
  },
  {
    id: 'theme_autumn',
    name: '诗意深秋',
    description: '金橙色渐变，枫叶轻轻飘落',
    icon: '🍁',
    type: 'theme',
    price: 2,
  },
  {
    id: 'theme_winter',
    name: '冬日暖晕',
    description: '蓝白色渐变，雪花缓慢飘落',
    icon: '❄️',
    type: 'theme',
    price: 2,
  },
  {
    id: 'badge_bronze',
    name: '青铜勋章',
    description: '彰显你的努力与坚持',
    icon: '🥉',
    type: 'badge',
    price: 1,
  },
  {
    id: 'badge_silver',
    name: '白银勋章',
    description: '展现你的专注与毅力',
    icon: '🥈',
    type: 'badge',
    price: 2,
  },
  {
    id: 'badge_gold',
    name: '黄金勋章',
    description: '证明你的卓越与非凡',
    icon: '🥇',
    type: 'badge',
    price: 3,
  },
  {
    id: 'badge_diamond',
    name: '钻石勋章',
    description: '专注带来的永恒闪耀',
    icon: '💎',
    type: 'badge',
    price: 10,
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 获取用户已购买的商品
    const purchases = await db.shopPurchase.findMany({
      where: { userId: session.user.id },
      select: { itemId: true },
    });

    const purchasedIds = new Set(purchases.map(p => p.itemId));

    // 标记已购买的商品
    const items = SHOP_ITEMS.map(item => ({
      ...item,
      purchased: purchasedIds.has(item.id),
    }));

    return res.status(200).json(items);
  } catch (error) {
    console.error('获取商城商品失败:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

