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
  
  // 优先使用客户端传递的日期（用户本地时区），否则使用服务器UTC日期
  // 客户端应该传递 YYYY-MM-DD 格式的本地日期
  const clientDate = req.query.date as string;
  const todayDate = clientDate || new Date().toISOString().split('T')[0];
  
  // 日志记录，便于调试时区问题
  console.log(`[daily-summary] 查询日期: ${todayDate}, 客户端传递: ${!!clientDate}, 用户: ${userId}`);

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

      // 🐛 修复：只有当小结内容不为空时，才认为用户已写小结
      const hasMeaningfulSummary = summary && summary.text && summary.text.trim().length > 0;

      // 🎯 判定标准：专注时间≥1分钟才算"已专注"（过滤测试/误触记录）
      return res.status(200).json({
        todayHasFocus: totalFocusMinutes >= 1,
        todayHasSummary: hasMeaningfulSummary,
        todaySummary: hasMeaningfulSummary
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

        // 🔥 保留最近 100 条小结，支持近100天历史数据查询
        const overflow = await db.dailySummary.findMany({
          where: { userId },
          orderBy: { date: 'desc' },
          skip: 100,
          select: { id: true },
        });

        if (overflow.length > 0) {
          await db.dailySummary.deleteMany({
            where: { id: { in: overflow.map(item => item.id) } },
          });
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

