import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // 主题设置存储在 localStorage，服务端返回默认值
    return res.status(200).json({ 
      theme: 'default',
    });
  }

  if (req.method === 'POST') {
    // 主题设置存储在 localStorage，服务端不持久化
    const { theme } = req.body;

    if (!theme || !['default', 'echo', 'salt_blue', 'fresh_green'].includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }

    return res.status(200).json({ success: true, theme });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

