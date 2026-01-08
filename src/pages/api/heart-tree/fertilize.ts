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

    // 增加施肥计数
    const user = await db.user.update({
      where: { id: session.user.id },
      data: { 
        fertilizerCount: { increment: 1 },
      },
      select: { 
        fertilizerCount: true,
      },
    });

    return res.status(200).json({ 
      success: true,
      fertilizerCount: user.fertilizerCount,
    });
  } catch (error) {
    console.error('施肥失败:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

