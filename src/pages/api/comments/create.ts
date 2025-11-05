import type { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';

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

    // Connect to the Neon database
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL 环境变量未设置');
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Generate a simple ID compatible with Prisma cuid format
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;
    const now = new Date();
    
    // Insert the comment from the form into the Postgres database
    // Using template literal syntax for Neon serverless
    await sql`
      INSERT INTO comments (id, comment, "createdAt", "updatedAt") 
      VALUES (${id}, ${comment}, ${now}, ${now})
    `;
    
    return res.status(200).json({ success: true, id });
  } catch (error) {
    console.error('创建评论失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return res.status(500).json({ 
      error: '服务器错误，请稍后重试',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}

