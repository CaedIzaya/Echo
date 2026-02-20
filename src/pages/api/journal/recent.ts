import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';

const FALLBACK_SUMMARY_TEXT = '今日很忙碌，暂无感悟';

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

    const [summaries, focusSessions] = await Promise.all([
      db.dailySummary.findMany({
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
        // 先取更多一点，后续和 focus session 合并再截断
        take: Math.min(limit * 2, 200),
      }),
      db.focusSession.findMany({
        where: {
          userId: session.user.id,
          duration: {
            gt: 0,
          },
        },
        select: {
          startTime: true,
          duration: true,
        },
        orderBy: {
          startTime: 'desc',
        },
        take: 5000,
      }),
    ]);

    const dayMap = new Map<
      string,
      {
        date: string;
        text: string;
        totalFocusMinutes: number;
        hasRealSummary: boolean;
      }
    >();

    for (const summary of summaries) {
      const text = (summary.text || '').trim();
      dayMap.set(summary.date, {
        date: summary.date,
        text,
        totalFocusMinutes: summary.totalFocusMinutes || 0,
        hasRealSummary: text.length > 0,
      });
    }

    for (const sessionRow of focusSessions) {
      const date = formatDate(sessionRow.startTime);
      const existed = dayMap.get(date);

      if (existed) {
        // 若该天没有真实小结，就累计分钟数用于展示
        if (!existed.hasRealSummary) {
          existed.totalFocusMinutes += sessionRow.duration || 0;
        }
        continue;
      }

      dayMap.set(date, {
        date,
        text: '',
        totalFocusMinutes: sessionRow.duration || 0,
        hasRealSummary: false,
      });
    }

    const mergedDays = Array.from(dayMap.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);

    const result = mergedDays.map((day) => ({
      date: day.date,
      preview: day.hasRealSummary
        ? generatePreview(day.text, 60)
        : FALLBACK_SUMMARY_TEXT,
      // 星星判定：有专注或有小结即显示，因此这里统一可点击
      hasSummary: true,
      totalFocusMinutes: day.totalFocusMinutes,
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

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

