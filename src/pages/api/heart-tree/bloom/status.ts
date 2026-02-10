import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { db } from '~/server/db';

/**
 * 获取开花状态
 * 
 * 用于页面加载时从数据库读取开花记录，判断是否需要显示花朵
 * 这样即使刷新页面，已经开的花也会保留
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: '未授权' });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        heartTreeLevel: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    return res.status(200).json({
      shouldShowBloom: false,
      bloomType: null,
      lastBloomTime: null,
      heartTreeLevel: user.heartTreeLevel,
    });
  } catch (error: any) {
    console.error('[bloom-status] 失败:', error);
    return res.status(500).json({ 
      error: '服务器错误',
      message: process.env.NODE_ENV === 'development' ? error?.message : undefined 
    });
  }
}



























