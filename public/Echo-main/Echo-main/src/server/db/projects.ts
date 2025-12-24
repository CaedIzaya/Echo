import { db } from "~/server/db";

export const projectRepository = {
  // 创建新项目
  async createProject(userId: string, data: {
    name: string;
    description?: string;
    icon: string;
    color: string;
    dailyGoalMinutes: number;
    targetDate?: Date;
    firstMilestone: string;
  }) {
    return await db.project.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        dailyGoalMinutes: data.dailyGoalMinutes,
        targetDate: data.targetDate,
        milestones: {
          create: [{
            title: data.firstMilestone,
            order: 0,
          }]
        }
      },
      include: {
        milestones: true,
      }
    });
  },

  // 获取用户的所有项目
  async getUserProjects(userId: string) {
    return await db.project.findMany({
      where: { userId },
      include: {
        milestones: {
          orderBy: { order: 'asc' }
        },
        focusSessions: {
          orderBy: { startTime: 'desc' },
          take: 10
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  // 获取活跃项目
  async getActiveProject(userId: string) {
    return await db.project.findFirst({
      where: { 
        userId,
        isActive: true
      },
      include: {
        milestones: {
          where: { isCompleted: false },
          orderBy: { order: 'asc' }
        }
      }
    });
  }
};