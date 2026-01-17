import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';

/**
 * 单个计划操作 API
 * 
 * GET - 获取计划详情
 * PUT - 更新计划
 * DELETE - 删除计划
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未授权' });
  }

  const { id } = req.query;
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: '无效的计划ID' });
  }

  try {
    // GET: 获取计划详情
    if (req.method === 'GET') {
      const project = await db.project.findFirst({
        where: { 
          id,
          userId: session.user.id // 确保只能访问自己的计划
        },
        include: {
          milestones: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!project) {
        return res.status(404).json({ error: '计划不存在' });
      }

      return res.status(200).json({ project });
    }

    // PUT: 更新计划
    if (req.method === 'PUT') {
      const { name, description, icon, color, dailyGoalMinutes, targetDate, isActive, isCompleted, isPrimary } = req.body;

      console.log('[projects] 更新计划:', id);

      // 验证计划归属
      const existingProject = await db.project.findFirst({
        where: { id, userId: session.user.id }
      });

      if (!existingProject) {
        return res.status(404).json({ error: '计划不存在或无权限' });
      }

      // 如果设置为主要计划，先取消其他计划的主要标记
      if (isPrimary === true) {
        await db.project.updateMany({
          where: { 
            userId: session.user.id,
            isPrimary: true,
            id: { not: id }
          },
          data: {
            isPrimary: false,
          }
        });
      }

      // 如果计划从未完成变为已完成，更新用户的全局统计
      if (isCompleted === true && !existingProject.isCompleted) {
        await db.user.update({
          where: { id: session.user.id },
          data: {
            totalCompletedProjects: {
              increment: 1
            }
          }
        });
        console.log('[projects] 用户总完成计划数+1');
        
        // 检查是否解锁首次完成计划成就
        const userStats = await db.user.findUnique({
          where: { id: session.user.id },
          select: { totalCompletedProjects: true }
        });
        
        if (userStats && userStats.totalCompletedProjects === 0) {
          // 尝试创建首次完成计划成就（如果不存在）
          await db.achievement.upsert({
            where: {
              userId_achievementId: {
                userId: session.user.id,
                achievementId: 'first_plan_completed'
              }
            },
            create: {
              userId: session.user.id,
              achievementId: 'first_plan_completed',
              category: 'milestone'
            },
            update: {}
          });
          console.log('[projects] 解锁首次完成计划成就');
        }
      }

      // 更新计划
      const updatedProject = await db.project.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          description: description !== undefined ? description : undefined,
          icon: icon !== undefined ? icon : undefined,
          color: color !== undefined ? color : undefined,
          dailyGoalMinutes: dailyGoalMinutes !== undefined ? dailyGoalMinutes : undefined,
          targetDate: targetDate !== undefined ? (targetDate ? new Date(targetDate) : null) : undefined,
          isActive: isActive !== undefined ? isActive : undefined,
          isCompleted: isCompleted !== undefined ? isCompleted : undefined,
          isPrimary: isPrimary !== undefined ? isPrimary : undefined,
        },
        include: {
          milestones: {
            orderBy: { order: 'asc' }
          }
        }
      });

      console.log('[projects] 更新成功:', updatedProject.id);

      return res.status(200).json({ project: updatedProject });
    }

    // DELETE: 删除计划
    if (req.method === 'DELETE') {
      console.log('[projects] 删除计划:', id);

      // 验证计划归属
      const existingProject = await db.project.findFirst({
        where: { id, userId: session.user.id }
      });

      if (!existingProject) {
        return res.status(404).json({ error: '计划不存在或无权限' });
      }

      // 删除计划（级联删除关联的里程碑和专注记录）
      await db.project.delete({
        where: { id }
      });

      console.log('[projects] 删除成功:', id);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: '方法不允许' });

  } catch (error: any) {
    console.error('[projects] 操作失败:', error);
    return res.status(500).json({ 
      error: '服务器错误',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}












