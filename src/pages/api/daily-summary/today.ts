import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '~/pages/api/auth/[...nextauth]';
import { db } from '~/server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;
  const todayDate = new Date().toISOString().split('T')[0];

  if (req.method === 'GET') {
    try {
      // 并行查询：今日小结 + 今日专注会话，兼顾功能与性能
      const startOfDay = new Date(todayDate);
      const endOfDay = new Date(todayDate);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const [summary, focusSessions] = await Promise.all([
        db.dailySummary.findUnique({
          where: {
            userId_date: {
              userId,
              date: todayDate,
            },
          },
        }),
        db.focusSession.findMany({
          where: {
            userId,
            startTime: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
          select: {
            duration: true, // 只取需要的字段，减少传输
            note: true,     // 获取专注内容（项目名或自定义目标）
            project: {
              select: {
                name: true,
              }
            }
          },
        }),
      ]);

      const totalFocusMinutes = focusSessions.reduce(
        (acc, session) => acc + (session.duration || 0),
        0,
      );

      // 生成任务列表
      const tasks = focusSessions.map(session => {
        const minutes = session.duration || 0;
        const taskName = session.note || session.project?.name || '专注时间';
        return `${taskName} ${minutes} 分钟`;
      }).filter(Boolean); // 过滤掉空值

      return res.status(200).json({
        todayHasFocus: totalFocusMinutes > 0,
        todayHasSummary: !!summary,
        todaySummary: summary
          ? {
              date: todayDate,
              text: summary.text,
              totalFocusMinutes: summary.totalFocusMinutes,
              completedTaskCount: summary.completedTaskCount,
            }
          : null,
        tasks, // 返回今日任务列表
        totalFocusMinutes,
      });

    } catch (error) {
      console.error('Failed to fetch daily summary', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { text, totalFocusMinutes, completedTaskCount } = req.body;

      // Upsert logic
      const existing = await db.dailySummary.findUnique({
        where: {
          userId_date: {
            userId,
            date: todayDate,
          },
        },
      });

      let result;

      if (existing) {
        result = await db.dailySummary.update({
          where: { id: existing.id },
          data: {
            text,
            totalFocusMinutes,
            completedTaskCount,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new
        result = await db.dailySummary.create({
          data: {
            userId,
            date: todayDate,
            text,
            totalFocusMinutes,
            completedTaskCount,
          },
        });

        // Check limit (90 days)
        const count = await db.dailySummary.count({
          where: { userId },
        });

        if (count > 90) {
          const oldest = await db.dailySummary.findFirst({
            where: { userId },
            orderBy: { date: 'asc' },
          });

          if (oldest) {
            await db.dailySummary.delete({
              where: { id: oldest.id },
            });
          }
        }
      }

      return res.status(200).json(result);

    } catch (error) {
      console.error('Failed to save daily summary', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

