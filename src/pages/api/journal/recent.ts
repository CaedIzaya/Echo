import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';

/**
 * 获取最近 N 天的专注小结摘要（最多 100 条）
 *
 * Query params:
 * - limit: 返回条数（可选，默认 100，最大 100）
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
    const limitParam = req.query.limit;
    const limitRaw = Array.isArray(limitParam) ? limitParam[0] : limitParam;
    const limitNum = limitRaw ? parseInt(limitRaw, 10) : 100;
    const limit = Number.isNaN(limitNum) ? 100 : Math.min(Math.max(limitNum, 1), 100);

    console.log('[journal/recent] 查询最近小结', {
      userId: session.user.id,
      limit,
    });

    const summaries = await db.dailySummary.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        date: true,
        text: true,
        totalFocusMinutes: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: limit,
    });

    const result = summaries.map((summary) => ({
      date: summary.date,
      preview: generatePreview(summary.text, 60),
      hasSummary: summary.text && summary.text.trim().length > 0,
      totalFocusMinutes: summary.totalFocusMinutes,
    }));

    console.log('[journal/recent] 查询成功', {
      count: result.length,
      daysWithSummary: result.filter(r => r.hasSummary).length,
    });

    return res.status(200).json({
      limit,
      summaries: result,
    });
  } catch (error: any) {
    console.error('[journal/recent] 查询失败', {
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

/**
 * 生成小结预览文本
 * - 去掉多余换行和空格
 * - 限制最大字符数
 */
function generatePreview(text: string, maxLength: number): string {
  if (!text) return '';

  const cleaned = text
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength) + '...';
  }

  return cleaned;
}

