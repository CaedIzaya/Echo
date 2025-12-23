import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';

/**
 * 用户计划数据迁移 API
 * 
 * 功能：将 localStorage 的 userPlans 数据迁移到数据库
 * 使用：用户登录后自动调用，或手动触发
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未授权' });
  }

  try {
    const { plans } = req.body;

    if (!Array.isArray(plans) || plans.length === 0) {
      return res.status(400).json({ error: '无效的计划数据' });
    }

    console.log('[migrate-plans] 开始迁移:', plans.length, '个计划');

    // 检查数据库中是否已有计划
    const existingProjects = await db.project.findMany({
      where: { userId: session.user.id }
    });

    if (existingProjects.length > 0) {
      console.log('[migrate-plans] 数据库已有', existingProjects.length, '个计划');
      
      // 如果数据库已有计划，询问是否合并或覆盖
      // 这里采取合并策略：只添加不存在的计划
      const existingIds = new Set(existingProjects.map(p => p.id));
      const newPlans = plans.filter(p => !existingIds.has(p.id));
      
      if (newPlans.length === 0) {
        return res.status(200).json({ 
          success: true,
          message: '所有计划已存在，无需迁移',
          migratedCount: 0
        });
      }
      
      plans.length = newPlans.length; // 只迁移新计划
    }

    let migratedCount = 0;
    const errors: string[] = [];

    // 逐个迁移计划
    for (const plan of plans) {
      try {
        // 创建计划
        const newProject = await db.project.create({
          data: {
            id: plan.id || undefined, // 保留原ID，如果有的话
            name: plan.name,
            description: plan.description,
            icon: plan.icon || '📋',
            color: plan.color,
            dailyGoalMinutes: plan.dailyGoalMinutes || 25,
            targetDate: plan.targetDate ? new Date(plan.targetDate) : null,
            isActive: plan.isActive !== false,
            userId: session.user.id,
            // 创建关联的里程碑
            milestones: {
              create: (plan.milestones || []).map((m: any, index: number) => ({
                id: m.id || undefined,
                title: m.title,
                isCompleted: m.isCompleted || false,
                order: m.order !== undefined ? m.order : index,
              }))
            }
          }
        });

        console.log('[migrate-plans] 迁移成功:', newProject.name);
        migratedCount++;

      } catch (error: any) {
        console.error('[migrate-plans] 迁移失败:', plan.name, error.message);
        errors.push(`${plan.name}: ${error.message}`);
      }
    }

    console.log('[migrate-plans] ✅ 迁移完成:', migratedCount, '/', plans.length);

    return res.status(200).json({ 
      success: true,
      migratedCount,
      total: plans.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `成功迁移 ${migratedCount} 个计划${errors.length > 0 ? `，${errors.length} 个失败` : ''}`
    });

  } catch (error: any) {
    console.error('[migrate-plans] 迁移失败:', error);
    return res.status(500).json({ 
      error: '服务器错误',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}







