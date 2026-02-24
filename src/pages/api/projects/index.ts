import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '~/server/db';
import { encodeProjectDescription, enrichProjectForClient } from '~/lib/projectMeta';

/**
 * 用户计划 API（完整数据库实现）
 * 
 * GET - 获取用户所有计划
 * POST - 创建新计划
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未授权' });
  }

  try {
    // GET: 获取用户所有计划
    if (req.method === 'GET') {
      console.log('[projects] 获取用户计划:', session.user.id);
      
      const projects = await db.project.findMany({
        where: { userId: session.user.id },
        include: {
          milestones: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log('[projects] 找到', projects.length, '个计划');

      return res.status(200).json({ projects: projects.map(enrichProjectForClient) });
    }

    // POST: 创建新计划
    if (req.method === 'POST') {
      const {
        id,
        name,
        description,
        focusDetail,
        icon,
        color,
        dailyGoalMinutes,
        targetDate,
        isActive,
        isPrimary,
        isCompleted,
        milestones
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: '计划名称不能为空' });
      }

      console.log('[projects] 创建计划:', { name, icon, dailyGoalMinutes, isPrimary });

      // 检查用户是否已有其他计划
      const existingProjects = await db.project.findMany({
        where: { userId: session.user.id },
        select: { id: true, isPrimary: true }
      });

      // 如果用户没有其他计划，默认设置为主要计划
      let shouldBePrimary = isPrimary;
      if (existingProjects.length === 0 && isPrimary === undefined) {
        shouldBePrimary = true;
        console.log('[projects] 用户首个计划，默认设置为主要计划');
      }

      // 如果设置为主要计划，先取消其他计划的主要标记
      if (shouldBePrimary) {
        console.log('[projects] 取消其他计划的主要标记');
        await db.project.updateMany({
          where: { 
            userId: session.user.id,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          }
        });
      }

      // 创建计划（保留原ID如果有的话，用于迁移）
      const createData: any = {
        name,
        description: encodeProjectDescription(description, focusDetail),
        icon: icon || '📋',
        color,
        dailyGoalMinutes: dailyGoalMinutes || 25,
        targetDate: targetDate ? new Date(targetDate) : null,
        isActive: isActive !== false, // 默认为 true
        isPrimary: shouldBePrimary || false,
        isCompleted: isCompleted || false,
        userId: session.user.id,
        milestones: {
          create: (milestones || []).map((m: any, index: number) => ({
            id: m.id || undefined, // 保留原ID（迁移用）
            title: m.title,
            isCompleted: m.isCompleted || false,
            order: m.order !== undefined ? m.order : index,
          }))
        }
      };

      // 如果有原ID，使用原ID（用于迁移保持ID一致）
      if (id) {
        createData.id = id;
      }

      const newProject = await db.project.create({
        data: createData,
        include: {
          milestones: {
            orderBy: { order: 'asc' }
          }
        }
      });

      console.log('[projects] 创建成功:', newProject.id);

      return res.status(201).json({ project: enrichProjectForClient(newProject) });
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