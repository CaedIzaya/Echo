import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';

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
      select: { fruits: true },
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

    return res.status(200).json({ 
      success: true,
      fruits: updatedUser?.fruits || 0,
    });
  } catch (error) {
    console.error('购买商品失败:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

