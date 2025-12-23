import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { db } from '~/server/db';

/**
 * 更新用户统计数据 API
 * 
 * 功能：
 * - 更新连续天数（streakDays）
 * - 更新总专注时长（totalFocusMinutes）
 * - 确保数据持久化到数据库
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未授权' });
  }

  try {
    const { streakDays, lastStreakDate, totalFocusMinutes } = req.body;

    // 验证数据
    if (
      (streakDays !== undefined && typeof streakDays !== 'number') ||
      (lastStreakDate !== undefined && typeof lastStreakDate !== 'string') ||
      (totalFocusMinutes !== undefined && typeof totalFocusMinutes !== 'number')
    ) {
      return res.status(400).json({ error: '数据格式错误' });
    }

    // 构建更新数据
    const updateData: any = {};
    if (streakDays !== undefined) updateData.streakDays = streakDays;
    if (lastStreakDate !== undefined) updateData.lastStreakDate = lastStreakDate;
    if (totalFocusMinutes !== undefined) updateData.totalFocusMinutes = totalFocusMinutes;

    // 更新数据库
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        streakDays: true,
        lastStreakDate: true,
        totalFocusMinutes: true,
      },
    });

    console.log('[user-stats] 更新成功:', {
      userId: session.user.id,
      updates: updateData,
    });

    return res.status(200).json({
      success: true,
      stats: updatedUser,
    });
  } catch (error: any) {
    console.error('[user-stats] 更新失败:', {
      userId: session.user.id,
      error: error?.message || error,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: '服务器错误',
      message: error?.message || '未知错误',
    });
  }
}



