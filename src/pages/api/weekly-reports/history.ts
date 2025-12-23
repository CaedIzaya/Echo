import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';
import { formatDateKey } from '~/lib/weeklyReport';

/**
 * 获取用户的周报历史列表
 * 
 * 功能：
 * - 返回最近4周的周报列表（不包括本周，本周单独生成）
 * - 用于周报导航和历史查看
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
    const userId = session.user.id;
    
    // 获取最近5周的周报（本周 + 4周历史）
    const reports = await db.weeklyReport.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
      take: 5,
      select: {
        id: true,
        weekStart: true,
        weekEnd: true,
        totalMinutes: true,
        streakDays: true,
        flowAvg: true,
        createdAt: true,
      },
    });

    // 格式化数据
    const history = reports.map((report) => {
      const weekStartStr = formatDateKey(report.weekStart);
      const weekEndStr = formatDateKey(report.weekEnd);
      const label = formatWeekLabel(report.weekStart, report.weekEnd);

      return {
        id: report.id,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        label,
        totalMinutes: report.totalMinutes,
        totalHours: (report.totalMinutes / 60).toFixed(1),
        streakDays: report.streakDays,
        flowAvg: report.flowAvg,
        createdAt: report.createdAt.toISOString(),
      };
    });

    console.log(`[weekly-reports/history] 获取周报历史: userId=${userId}, count=${history.length}`);

    return res.status(200).json({ 
      success: true,
      history,
      total: history.length 
    });
  } catch (error: any) {
    console.error('[weekly-reports/history] 获取周报历史失败:', {
      userId: session.user.id,
      error: error?.message || error,
      stack: error?.stack,
    });

    return res.status(500).json({ 
      error: '服务器错误',
      message: error?.message || '未知错误'
    });
  }
}

function formatWeekLabel(start: Date, end: Date) {
  const fmt = (d: Date) => {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
}



