import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

/**
 * 心树开花检查（暂时禁用）
 *
 * 说明：
 * - 当前 schema 中缺少 bloom 相关字段
 * - 先统一返回不可开花，避免构建失败与误触发
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: '未授权' });
    }

    return res.status(200).json({
      canBloom: false,
      canLevelBloom: false,
      canWeeklyBloom: false,
      reasons: ['bloom_disabled'],
      currentWeek: getWeekIdentifier(new Date()),
    });
  } catch (error: any) {
    console.error('[bloom-check] 失败:', error);
    return res.status(500).json({
      error: '服务器错误',
      message: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
}

/**
 * 获取周标识符 (YYYY-Www 格式)
 */
function getWeekIdentifier(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}
