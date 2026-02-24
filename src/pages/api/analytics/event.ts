import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';
import { formatDateKey } from '~/lib/weeklyReport';

type EventBody = {
  name: string;
  feature?: string;
  page?: string;
  action?: string;
  properties?: Record<string, any>;
  sessionId?: string;
  clientTime?: string;
  timezone?: string;
  dateKey?: string;
  idempotencyKey?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = session?.user?.id ?? null;

  try {
    const body = req.body as EventBody;
    if (!body?.name) {
      return res.status(400).json({ error: '缺少事件名' });
    }

    const eventTime = body.clientTime ? new Date(body.clientTime) : new Date();
    const dateKey = body.dateKey || formatDateKey(eventTime);

    // 写入事件
    try {
      await db.event.create({
        data: {
          userId: userId ?? undefined,
          sessionId: body.sessionId,
          name: body.name,
          feature: body.feature,
          page: body.page,
          action: body.action,
          properties: body.properties ?? undefined,
          clientTime: body.clientTime ? new Date(body.clientTime) : undefined,
          timezone: body.timezone,
          dateKey,
          idempotencyKey: body.idempotencyKey,
        },
      });
    } catch (error: any) {
      // 幂等冲突可忽略
      if (!String(error?.message || '').includes('Unique constraint failed')) {
        throw error;
      }
    }

    if (userId) {
      // 更新用户最后活跃时间
      await db.user.update({
        where: { id: userId },
        data: { lastActiveAt: eventTime },
      });

      // 更新/创建会话
      if (body.sessionId) {
        const existingSession = await db.userSession.findUnique({
          where: { sessionId: body.sessionId },
        });

        if (!existingSession) {
          await db.userSession.create({
            data: {
              sessionId: body.sessionId,
              userId,
              startedAt: eventTime,
              endedAt: eventTime,
              durationSec: 0,
              entryPage: body.page,
              timezone: body.timezone,
              dateKey,
              hasPlan: !!body.properties?.projectId,
            },
          });

          // 记录首次会话时间
          await db.user.updateMany({
            where: { id: userId, firstSessionAt: null },
            data: { firstSessionAt: eventTime },
          });
        } else {
          const durationSec = Math.max(
            0,
            Math.floor(
              (eventTime.getTime() - existingSession.startedAt.getTime()) / 1000,
            ),
          );
          await db.userSession.update({
            where: { sessionId: body.sessionId },
            data: {
              endedAt: eventTime,
              durationSec,
              hasPlan: existingSession.hasPlan || !!body.properties?.projectId,
            },
          });
        }
      }

      // 更新每日活跃
      const existingActivity = await db.dailyUserActivity.findUnique({
        where: { userId_dateKey: { userId, dateKey } },
      });

      const durationMinutes = Number(
        body.properties?.durationMinutes ?? body.properties?.duration,
      );
      const projectId = body.properties?.projectId as string | undefined;
      const hasPlan = !!projectId;
      let goalMinutes: number | null = null;
      if (body.name === 'focus_complete' && projectId) {
        const project = await db.project.findUnique({
          where: { id: projectId },
          select: { dailyGoalMinutes: true },
        });
        goalMinutes = project?.dailyGoalMinutes ?? null;
      }
      const isMinMetFallback =
        !hasPlan &&
        Number.isFinite(durationMinutes) &&
        durationMinutes >= 30;
      const isMinMet =
        body.properties?.isMinMet === true ||
        (goalMinutes ? durationMinutes >= goalMinutes : false) ||
        isMinMetFallback;
      const isActive = body.name === 'focus_complete';
      const isQualityActive =
        body.name === 'summary_save' ||
        (body.name === 'focus_complete' && isMinMet);

      if (!existingActivity) {
        await db.dailyUserActivity.create({
          data: {
            userId,
            dateKey,
            firstEventAt: eventTime,
            lastEventAt: eventTime,
            eventCount: 1,
            sessionCount: body.name === 'session_start' ? 1 : 0,
            active: isActive,
            qualityActive: isQualityActive,
          },
        });
      } else {
        await db.dailyUserActivity.update({
          where: { userId_dateKey: { userId, dateKey } },
          data: {
            firstEventAt:
              eventTime < existingActivity.firstEventAt
                ? eventTime
                : existingActivity.firstEventAt,
            lastEventAt: eventTime,
            eventCount: { increment: 1 },
            sessionCount:
              body.name === 'session_start'
                ? { increment: 1 }
                : undefined,
            active: existingActivity.active || isActive,
            qualityActive: existingActivity.qualityActive || isQualityActive,
          },
        });
      }

      // 激活时间
      if (body.name === 'focus_complete') {
        await db.user.updateMany({
          where: { id: userId, activatedAt: null },
          data: { activatedAt: eventTime },
        });
      }
      if (isQualityActive) {
        await db.user.updateMany({
          where: { id: userId, qualityActivatedAt: null },
          data: { qualityActivatedAt: eventTime },
        });
      }

      // 功能访问统计
      const shouldCountFeature =
        body.name === 'page_view' ||
        body.name === 'feature_open' ||
        body.action === 'open';

      if (shouldCountFeature && body.feature) {
        const existingFeature = await db.featureUsageDaily.findUnique({
          where: {
            userId_dateKey_feature: { userId, dateKey, feature: body.feature },
          },
        });

        if (!existingFeature) {
          await db.featureUsageDaily.create({
            data: {
              userId,
              dateKey,
              feature: body.feature,
              count: 1,
              firstAt: eventTime,
              lastAt: eventTime,
            },
          });
        } else {
          await db.featureUsageDaily.update({
            where: {
              userId_dateKey_feature: { userId, dateKey, feature: body.feature },
            },
            data: {
              count: { increment: 1 },
              firstAt:
                eventTime < (existingFeature.firstAt ?? eventTime)
                  ? eventTime
                  : existingFeature.firstAt,
              lastAt: eventTime,
            },
          });
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[analytics/event] 保存失败:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}
