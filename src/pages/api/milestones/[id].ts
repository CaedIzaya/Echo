import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
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

  const { id } = req.query;
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: '无效的里程碑ID' });
  }

  try {
    // 验证里程碑归属（通过project的userId）
    const milestone = await db.milestone.findFirst({
      where: { id },
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

      console.log('[milestone] 更新里程碑:', id);

      // 如果小目标从未完成变为已完成，更新统计数据
      if (isCompleted === true && !milestone.isCompleted) {
        // 更新用户全局统计
        await db.user.update({
          where: { id: session.user.id },
          data: {
            totalCompletedMilestones: {
              increment: 1
            }
          }
        });
        console.log('[milestone] 用户总完成小目标数+1');
        
        // 更新项目统计
        await db.project.update({
          where: { id: milestone.projectId },
          data: {
            completedMilestones: {
              increment: 1
            }
          }
        });
        console.log('[milestone] 项目完成小目标数+1');
        
        // 检查是否解锁首次完成小目标成就
        const userStats = await db.user.findUnique({
          where: { id: session.user.id },
          select: { totalCompletedMilestones: true }
        });
        
        if (userStats && userStats.totalCompletedMilestones === 0) {
          await db.achievement.upsert({
            where: {
              userId_achievementId: {
                userId: session.user.id,
                achievementId: 'first_milestone_completed'
              }
            },
            create: {
              userId: session.user.id,
              achievementId: 'first_milestone_completed',
              category: 'milestone'
            },
            update: {}
          });
          console.log('[milestone] 解锁首次完成小目标成就');
        }
      }

      const updatedMilestone = await db.milestone.update({
        where: { id },
        data: {
          title: title !== undefined ? title : undefined,
          isCompleted: isCompleted !== undefined ? isCompleted : undefined,
          order: order !== undefined ? order : undefined,
        }
      });

      console.log('[milestone] 更新成功:', updatedMilestone.id);

      return res.status(200).json({ milestone: updatedMilestone });
    }

    // DELETE: 删除里程碑
    if (req.method === 'DELETE') {
      console.log('[milestone] 删除里程碑:', id);

      await db.milestone.delete({
        where: { id }
      });

      console.log('[milestone] 删除成功:', id);

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







