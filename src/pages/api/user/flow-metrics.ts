import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';

/**
 * 心流指标 API
 * 
 * GET - 获取用户心流指标
 * POST - 更新心流指标
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未授权' });
  }

  try {
    // GET: 获取心流指标
    if (req.method === 'GET') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { flowMetrics: true }
      });

      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }

      // 如果没有心流指标，返回默认值
      const defaultMetrics = {
        impression: 50,
        tempFlow: 0,
        totalFocusMinutes: 0,
        sessionCount: 0,
        lastUpdateTs: Date.now(),
      };

      const flowMetrics = user.flowMetrics || defaultMetrics;

      return res.status(200).json({ flowMetrics });
    }

    // POST: 更新心流指标
    if (req.method === 'POST') {
      const { flowMetrics } = req.body;

      if (!flowMetrics || typeof flowMetrics !== 'object') {
        return res.status(400).json({ error: '无效的心流指标数据' });
      }

      console.log('[flow-metrics] 更新心流指标');

      await db.user.update({
        where: { id: session.user.id },
        data: {
          flowMetrics: flowMetrics as any, // Prisma Json 类型
        }
      });

      console.log('[flow-metrics] 更新成功');

      return res.status(200).json({ 
        success: true,
        flowMetrics 
      });
    }

    return res.status(405).json({ error: '方法不允许' });

  } catch (error: any) {
    console.error('[flow-metrics] 操作失败:', error);
    return res.status(500).json({ 
      error: '服务器错误',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}




