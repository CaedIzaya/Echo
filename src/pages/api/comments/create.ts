import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '~/server/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { comment } = req.body;

    if (!comment || typeof comment !== 'string') {
      return res.status(400).json({ error: '评论不能为空' });
    }

    // 使用 Prisma 创建评论
    const newComment = await db.comment.create({
      data: {
        comment: comment.trim(),
      },
    });
    
    return res.status(200).json({ success: true, id: newComment.id });
  } catch (error) {
    console.error('创建评论失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return res.status(500).json({ 
      error: '服务器错误，请稍后重试',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}

