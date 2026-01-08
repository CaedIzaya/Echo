import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '~/server/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    // 使用 Prisma 获取所有评论，按创建时间倒序排列
    const comments = await db.comment.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return res.status(200).json({ success: true, comments });
  } catch (error) {
    console.error('获取评论失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return res.status(500).json({ 
      error: '服务器错误，请稍后重试',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}







































