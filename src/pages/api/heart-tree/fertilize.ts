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

    // 施肥逻辑已集成到 exp/update.ts 的 fertilizerBuff 中
    // 这里只返回成功响应，不单独记录 fertilizerCount
    
    return res.status(200).json({ 
      success: true,
      message: '施肥成功',
    });
  } catch (error) {
    console.error('施肥失败:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

