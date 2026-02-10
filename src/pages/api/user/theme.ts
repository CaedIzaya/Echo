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
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { theme: true },
    });

    return res.status(200).json({
      theme: user?.theme || 'default',
    });
  }

  if (req.method === 'POST') {
    const { theme } = req.body;

    if (!theme || !['default', 'echo', 'salt_blue', 'fresh_green', 'spring', 'summer', 'autumn', 'winter'].includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { theme },
    });

    return res.status(200).json({ success: true, theme });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
