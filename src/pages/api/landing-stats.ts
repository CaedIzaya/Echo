import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '~/server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const [userCount, sessionCount, minutesAgg] = await Promise.all([
      db.user.count(),
      db.focusSession.count(),
      db.focusSession.aggregate({ _sum: { duration: true } }),
    ]);

    const totalMinutes = minutesAgg._sum.duration ?? 0;

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({
      users: userCount,
      sessions: sessionCount,
      totalHours: Math.floor(totalMinutes / 60),
    });
  } catch (error) {
    console.error('[landing-stats] 查询失败:', error);
    return res.status(200).json({ users: 0, sessions: 0, totalHours: 0 });
  }
}
