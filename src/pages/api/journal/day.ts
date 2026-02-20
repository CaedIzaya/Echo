import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';

const FALLBACK_SUMMARY_TEXT = '今日很忙碌，暂无感悟';

/**
 * 获取某天的完整小结详情
 * 
 * Query params:
 * - date: 日期 (YYYY-MM-DD)
 * 
 * 返回该天的小结内容、专注会话、关联计划等信息
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未授权' });
  }

  try {
    const { date } = req.query;

    // 参数验证
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: '缺少必需参数：date (YYYY-MM-DD)' });
    }

    // 验证日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: '无效的日期格式，应为 YYYY-MM-DD' });
    }

    console.log('[journal/day] 查询日详情', {
      userId: session.user.id,
      date,
    });

    // 计算当天的起止时间
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 并行查询：小结 + 专注会话 + 用户主要计划
    const [summary, focusSessions, primaryProject] = await Promise.all([
      // 查询小结
      db.dailySummary.findUnique({
        where: {
          userId_date: {
            userId: session.user.id,
            date: date,
          },
        },
      }),

      // 查询当天的专注会话
      db.focusSession.findMany({
        where: {
          userId: session.user.id,
          startTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          duration: true,
          startTime: true,
          note: true,
          flowIndex: true,
          project: {
            select: {
              name: true,
              icon: true,
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      }),

      // 查询用户的主要计划
      db.project.findFirst({
        where: {
          userId: session.user.id,
          isPrimary: true,
          isActive: true,
        },
        select: {
          name: true,
          icon: true,
          dailyGoalMinutes: true,
        },
      }),
    ]);

    // 计算统计数据
    const totalFocusMinutes = focusSessions.reduce(
      (sum, session) => sum + (session.duration || 0),
      0
    );

    const sessionCount = focusSessions.length;

    // 计算平均心流指数
    const flowIndexes = focusSessions
      .map(s => s.flowIndex)
      .filter((f): f is number => f !== null && f !== undefined);
    const avgFlowIndex = flowIndexes.length > 0
      ? Math.round(flowIndexes.reduce((a, b) => a + b, 0) / flowIndexes.length)
      : null;

    // 生成会话列表
    const sessions = focusSessions.map(session => ({
      duration: session.duration,
      startTime: session.startTime.toISOString(),
      note: session.note,
      flowIndex: session.flowIndex,
      projectName: session.project?.name,
      projectIcon: session.project?.icon,
    }));

    const realSummaryText = (summary?.text || '').trim();
    const hasFocusAction = totalFocusMinutes > 0 || sessionCount > 0;
    const resolvedSummaryText =
      realSummaryText.length > 0
        ? realSummaryText
        : hasFocusAction
          ? FALLBACK_SUMMARY_TEXT
          : '';

    const result = {
      date,
      hasSummary: resolvedSummaryText.length > 0,
      summary: {
        text: resolvedSummaryText,
        totalFocusMinutes: summary?.totalFocusMinutes || totalFocusMinutes,
        completedTaskCount: summary?.completedTaskCount || 0,
        createdAt: summary?.createdAt?.toISOString(),
        updatedAt: summary?.updatedAt?.toISOString(),
      },
      stats: {
        totalFocusMinutes,
        sessionCount,
        avgFlowIndex,
      },
      primaryProject: primaryProject ? {
        name: primaryProject.name,
        icon: primaryProject.icon,
        dailyGoalMinutes: primaryProject.dailyGoalMinutes,
        completionRate: primaryProject.dailyGoalMinutes > 0
          ? Math.round((totalFocusMinutes / primaryProject.dailyGoalMinutes) * 100)
          : 0,
      } : null,
      sessions,
    };

    console.log('[journal/day] 查询成功', {
      hasSummary: result.hasSummary,
      totalMinutes: totalFocusMinutes,
      sessionCount,
    });

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('[journal/day] 查询失败', {
      userId: session.user.id,
      error: error?.message || error,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: '服务器错误',
      message: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
}

