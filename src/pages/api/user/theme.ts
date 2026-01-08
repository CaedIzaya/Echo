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
    // 获取用户主题设置
    try {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { selectedTheme: true },
      });

      return res.status(200).json({ 
        theme: user?.selectedTheme || 'default',
      });
    } catch (error) {
      console.error('获取主题设置失败:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    // 更新用户主题设置
    try {
      const { theme } = req.body;

      if (!theme || !['default', 'echo', 'salt_blue', 'fresh_green'].includes(theme)) {
        return res.status(400).json({ error: 'Invalid theme' });
      }

      await db.user.update({
        where: { id: session.user.id },
        data: { selectedTheme: theme },
      });

      return res.status(200).json({ success: true, theme });
    } catch (error) {
      console.error('更新主题设置失败:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

