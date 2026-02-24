import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { db } from '~/server/db';
import { formatDateKey } from '~/lib/weeklyReport';

type PingBody = {
  sessionId: string;
  entryPage?: string;
  startedAt?: string;
  clientTime?: string;
  timezone?: string;
  dateKey?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未授权' });
  }

  try {
    const body = req.body as PingBody;
    if (!body?.sessionId) {
      return res.status(400).json({ error: '缺少 sessionId' });
    }

    const userId = session.user.id;
    const eventTime = body.clientTime ? new Date(body.clientTime) : new Date();
    const dateKey = body.dateKey || formatDateKey(eventTime);

    const existing = await db.userSession.findUnique({
      where: { sessionId: body.sessionId },
    });

    if (!existing) {
      const startedAt = body.startedAt ? new Date(body.startedAt) : eventTime;
      await db.userSession.create({
        data: {
          sessionId: body.sessionId,
          userId,
          startedAt,
          endedAt: eventTime,
          durationSec: Math.max(
            0,
            Math.floor((eventTime.getTime() - startedAt.getTime()) / 1000),
          ),
          entryPage: body.entryPage,
          timezone: body.timezone,
          dateKey,
        },
      });

      await db.user.updateMany({
        where: { id: userId, firstSessionAt: null },
        data: { firstSessionAt: startedAt },
      });
    } else {
      const durationSec = Math.max(
        0,
        Math.floor((eventTime.getTime() - existing.startedAt.getTime()) / 1000),
      );
      await db.userSession.update({
        where: { sessionId: body.sessionId },
        data: {
          endedAt: eventTime,
          durationSec,
        },
      });

      // 规则：无计划且停留 >= 30min 算活跃
      if (!existing.hasPlan && durationSec >= 30 * 60) {
        await db.dailyUserActivity.updateMany({
          where: { userId, dateKey },
          data: { active: true },
        });
      }
    }

    await db.user.update({
      where: { id: userId },
      data: { lastActiveAt: eventTime },
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[analytics/session/ping] 失败:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}
