import { db } from "~/server/db";

export const focusSessionRepository = {
  // 创建专注会话
  async createSession(userId: string, data: {
    startTime: Date;
    projectId?: string;
    plannedDuration: number;
  }) {
    return await db.focusSession.create({
      data: {
        userId,
        startTime: data.startTime,
        projectId: data.projectId,
        duration: data.plannedDuration,
      }
    });
  },

  // 完成专注会话
  async completeSession(sessionId: string, data: {
    endTime: Date;
    actualDuration: number;
    note?: string;
    rating?: number;
  }) {
    return await db.focusSession.update({
      where: { id: sessionId },
      data: {
        endTime: data.endTime,
        duration: data.actualDuration,
        note: data.note,
        rating: data.rating,
      }
    });
  },

  // 获取用户的本周专注数据
  async getWeeklyStats(userId: string) {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return await db.focusSession.groupBy({
      by: ['userId'],
      where: {
        userId,
        startTime: { gte: startOfWeek },
        endTime: { not: null }
      },
      _sum: {
        duration: true
      },
      _count: {
        id: true
      }
    });
  }
};