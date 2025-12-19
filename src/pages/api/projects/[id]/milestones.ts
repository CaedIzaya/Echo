import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { db } from '~/server/db';

/**
 * 里程碑 CRUD API
 * 
 * GET - 获取计划的所有里程碑
 * POST - 创建新里程碑
 * PUT - 更新里程碑（批量更新）
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未授权' });
  }

  const { id: projectId } = req.query;
  
  if (typeof projectId !== 'string') {
    return res.status(400).json({ error: '无效的计划ID' });
  }

  try {
    // 验证计划归属
    const project = await db.project.findFirst({
      where: { 
        id: projectId,
        userId: session.user.id 
      }
    });

    if (!project) {
      return res.status(404).json({ error: '计划不存在或无权限' });
    }

    // GET: 获取里程碑
    if (req.method === 'GET') {
      const milestones = await db.milestone.findMany({
        where: { projectId },
        orderBy: { order: 'asc' }
      });

      return res.status(200).json({ milestones });
    }

    // POST: 创建里程碑
    if (req.method === 'POST') {
      const { title, order } = req.body;

      if (!title) {
        return res.status(400).json({ error: '标题不能为空' });
      }

      console.log('[milestones] 创建里程碑:', { projectId, title });

      // 如果没有指定 order，使用最大值+1
      let milestoneOrder = order;
      if (milestoneOrder === undefined) {
        const maxOrderMilestone = await db.milestone.findFirst({
          where: { projectId },
          orderBy: { order: 'desc' }
        });
        milestoneOrder = (maxOrderMilestone?.order ?? -1) + 1;
      }

      const milestone = await db.milestone.create({
        data: {
          title,
          order: milestoneOrder,
          projectId,
          isCompleted: false,
        }
      });

      console.log('[milestones] 创建成功:', milestone.id);

      return res.status(201).json({ milestone });
    }

    // PUT: 批量更新里程碑
    if (req.method === 'PUT') {
      const { milestones } = req.body;

      if (!Array.isArray(milestones)) {
        return res.status(400).json({ error: '无效的里程碑数据' });
      }

      console.log('[milestones] 批量更新:', milestones.length, '个里程碑');

      // 批量更新
      const updatePromises = milestones.map((m: any) =>
        db.milestone.update({
          where: { id: m.id },
          data: {
            title: m.title,
            isCompleted: m.isCompleted,
            order: m.order,
          }
        })
      );

      await Promise.all(updatePromises);

      // 返回更新后的里程碑
      const updatedMilestones = await db.milestone.findMany({
        where: { projectId },
        orderBy: { order: 'asc' }
      });

      console.log('[milestones] 批量更新成功');

      return res.status(200).json({ milestones: updatedMilestones });
    }

    return res.status(405).json({ error: '方法不允许' });

  } catch (error: any) {
    console.error('[milestones] 操作失败:', error);
    return res.status(500).json({ 
      error: '服务器错误',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

