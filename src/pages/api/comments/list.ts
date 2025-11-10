import type { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    // Connect to the Neon database
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL 环境变量未设置');
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Fetch all comments ordered by creation time (newest first)
    const comments = await sql`
      SELECT id, comment, "createdAt", "updatedAt"
      FROM comments
      ORDER BY "createdAt" DESC
    `;
    
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








