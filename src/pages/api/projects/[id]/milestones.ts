import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { db } from '~/server/db';

/**
 * 里程碑操作 API
 * 
 * POST - 创建新里程碑
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

    // POST: 创建新里程碑
    if (req.method === 'POST') {
      const { title, order } = req.body;

      if (!title) {
        return res.status(400).json({ error: '标题不能为空' });
      }

      console.log('[milestones] 创建里程碑:', { projectId, title });

      const milestone = await db.milestone.create({
        data: {
          title,
          order: order || 0,
          isCompleted: false,
          projectId,
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

      console.log('[milestones] 批量更新里程碑:', { projectId, count: milestones.length });

      // 删除旧的里程碑
      await db.milestone.deleteMany({
        where: { projectId }
      });

      // 创建新的里程碑列表
      const created = await Promise.all(
        milestones.map((m: any) => 
          db.milestone.create({
            data: {
              id: m.id || undefined,
              title: m.title,
              isCompleted: m.isCompleted || false,
              order: m.order || 0,
              projectId,
            }
          })
        )
      );

      console.log('[milestones] 批量更新成功:', created.length);

      return res.status(200).json({ milestones: created });
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
