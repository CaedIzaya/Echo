import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';
import {
  calculateTodayStats,
  calculateWeeklyStats,
  calculateTotalStats,
  calculateYesterdayStats,
  calculateStreakDays,
} from '~/lib/statsCalculator';

/**
 * 统计数据 API
 * 
 * GET - 从数据库实时计算所有统计数据
 * 替代：localStorage 中的 todayStats, weeklyStats 等
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未授权' });
  }

  try {
    console.log('[stats] 计算统计数据:', session.user.id);

    // 从数据库加载所有专注记录
    const focusSessions = await db.focusSession.findMany({
      where: { userId: session.user.id },
      select: {
        duration: true,
        startTime: true,
        rating: true,
      },
      orderBy: { startTime: 'desc' }
    });

    console.log('[stats] 找到', focusSessions.length, '条专注记录');

    // 计算各项统计
    const todayStats = calculateTodayStats(focusSessions);
    const weeklyStats = calculateWeeklyStats(focusSessions);
    const totalStats = calculateTotalStats(focusSessions);
    const yesterdayMinutes = calculateYesterdayStats(focusSessions);
    const streakDays = calculateStreakDays(focusSessions);

    // 计算完成的小目标数量
    const completedMilestones = await db.milestone.count({
      where: {
        project: {
          userId: session.user.id
        },
        isCompleted: true
      }
    });

    const stats = {
      // 今日统计
      today: todayStats,
      
      // 本周统计
      weekly: weeklyStats,
      
      // 累计统计
      total: totalStats,
      
      // 其他指标
      yesterdayMinutes,
      streakDays,
      completedGoals: completedMilestones,
      
      // 元数据
      calculatedAt: new Date().toISOString(),
    };

    console.log('[stats] 计算完成:', {
      today: `${todayStats.minutes}分钟`,
      week: `${weeklyStats.totalMinutes}分钟`,
      total: `${totalStats.totalMinutes}分钟`,
      streak: `${streakDays}天`
    });

    return res.status(200).json(stats);

  } catch (error: any) {
    console.error('[stats] 计算失败:', error);
    return res.status(500).json({ 
      error: '服务器错误',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}




