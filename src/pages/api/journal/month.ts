import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';

/**
 * 获取某月的所有专注小结摘要
 * 
 * Query params:
 * - year: 年份 (YYYY)
 * - month: 月份 (1-12)
 * 
 * 返回该月每天的小结摘要（用于日历视图）
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
    const { year, month } = req.query;

    // 参数验证
    if (!year || !month) {
      return res.status(400).json({ error: '缺少必需参数：year, month' });
    }

    const yearNum = parseInt(year as string, 10);
    const monthNum = parseInt(month as string, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: '无效的年份或月份' });
    }

    // 计算月份的起止日期
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    console.log('[journal/month] 查询月度小结', {
      userId: session.user.id,
      year: yearNum,
      month: monthNum,
      dateRange: `${startDateStr} ~ ${endDateStr}`,
    });

    // 查询该月的所有小结（只需要摘要信息）
    const summaries = await db.dailySummary.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDateStr,
          lte: endDateStr,
        },
      },
      select: {
        date: true,
        text: true,
        totalFocusMinutes: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // 转换为日历视图所需的格式
    const result = summaries.map((summary) => ({
      date: summary.date,
      // 生成摘要：去掉多余空格和换行，最多60字
      preview: generatePreview(summary.text, 60),
      hasSummary: summary.text && summary.text.trim().length > 0,
      totalFocusMinutes: summary.totalFocusMinutes,
    }));

    console.log('[journal/month] 查询成功', {
      count: result.length,
      daysWithSummary: result.filter(r => r.hasSummary).length,
    });

    return res.status(200).json({
      year: yearNum,
      month: monthNum,
      summaries: result,
    });

  } catch (error: any) {
    console.error('[journal/month] 查询失败', {
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
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 生成小结预览文本
 * - 去掉多余换行和空格
 * - 限制最大字符数
 */
function generatePreview(text: string, maxLength: number): string {
  if (!text) return '';
  
  // 去掉多余的换行和空格
  const cleaned = text
    .replace(/\n+/g, ' ')  // 换行替换为空格
    .replace(/\s+/g, ' ')  // 多个空格替换为单个
    .trim();
  
  // 截断并添加省略号
  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength) + '...';
  }
  
  return cleaned;
}

