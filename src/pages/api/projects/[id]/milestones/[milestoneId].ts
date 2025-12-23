import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { db } from '~/server/db';

/**
 * 单个里程碑操作 API
 * 
 * PUT - 更新里程碑
 * DELETE - 删除里程碑
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未授权' });
  }

  const { id: projectId, milestoneId } = req.query;
  
  if (typeof projectId !== 'string' || typeof milestoneId !== 'string') {
    return res.status(400).json({ error: '无效的ID' });
  }

  try {
    // 验证里程碑归属
    const milestone = await db.milestone.findFirst({
      where: { id: milestoneId },
      include: {
        project: true
      }
    });

    if (!milestone || milestone.project.userId !== session.user.id) {
      return res.status(404).json({ error: '里程碑不存在或无权限' });
    }

    // PUT: 更新里程碑
    if (req.method === 'PUT') {
      const { title, isCompleted, order } = req.body;

      console.log('[milestone] 更新里程碑:', { milestoneId, title, isCompleted });

      const updated = await db.milestone.update({
        where: { id: milestoneId },
        data: {
          title: title !== undefined ? title : undefined,
          isCompleted: isCompleted !== undefined ? isCompleted : undefined,
          order: order !== undefined ? order : undefined,
        }
      });

      console.log('[milestone] 更新成功');

      return res.status(200).json({ milestone: updated });
    }

    // DELETE: 删除里程碑
    if (req.method === 'DELETE') {
      console.log('[milestone] 删除里程碑:', milestoneId);

      await db.milestone.delete({
        where: { id: milestoneId }
      });

      console.log('[milestone] 删除成功');

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: '方法不允许' });

  } catch (error: any) {
    console.error('[milestone] 操作失败:', error);
    return res.status(500).json({ 
      error: '服务器错误',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}







