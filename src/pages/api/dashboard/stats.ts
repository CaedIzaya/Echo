import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";

/**
 * Dashboard 统计数据 API
 * 
 * 目的：提供关键数据的数据库来源，确保数据准确性
 * 返回：今日、本周、累计统计数据
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "未授权" });
  }

  try {
    console.log("[dashboard/stats] 开始加载统计数据", { userId: session.user.id });

    const userId = session.user.id;
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getCurrentWeekStart();

    // 并行查询所有数据
    const [user, todaySessions, weekSessions, allSessions] = await Promise.all([
      // 用户基础数据
      db.user.findUnique({
        where: { id: userId },
        select: {
          totalFocusMinutes: true,
          streakDays: true,
          lastStreakDate: true,
          echoCompanionDays: true,
          lastEchoCompanionDate: true,
        },
      }),
      
      // 今日专注记录
      db.focusSession.findMany({
        where: {
          userId,
          startTime: {
            gte: new Date(`${today}T00:00:00.000Z`),
            lt: new Date(`${today}T23:59:59.999Z`),
          },
        },
        select: { duration: true },
      }),
      
      // 本周专注记录
      db.focusSession.findMany({
        where: {
          userId,
          startTime: {
            gte: new Date(`${weekStart}T00:00:00.000Z`),
          },
        },
        select: { duration: true },
      }),
      
      // 所有专注记录（用于计算累计）
      db.focusSession.aggregate({
        where: { userId },
        _sum: { duration: true },
      }),
    ]);

    // 计算今日专注时长
    const todayMinutes = todaySessions.reduce(
      (sum, session) => sum + (session.duration || 0),
      0
    );

    // 计算本周专注时长
    const weeklyMinutes = weekSessions.reduce(
      (sum, session) => sum + (session.duration || 0),
      0
    );

    // 累计专注时长
    const totalMinutes = allSessions._sum.duration || 0;

    // 🔥 更新用户累计数据（如果数据库中的值不一致）
    if (user && user.totalFocusMinutes !== totalMinutes) {
      console.log('[dashboard/stats] 更新用户累计专注时长', {
        旧值: user.totalFocusMinutes,
        新值: totalMinutes,
      });
      
      await db.user.update({
        where: { id: userId },
        data: { totalFocusMinutes: totalMinutes },
      });
    }

    const result = {
      todayMinutes,
      todayDate: today,
      weeklyMinutes,
      weekStart,
      totalMinutes,
      streakDays: user?.streakDays || 0,
      lastStreakDate: user?.lastStreakDate || null,
      echoCompanionDays: user?.echoCompanionDays || 0,
      lastEchoCompanionDate: user?.lastEchoCompanionDate || null,
      syncedAt: new Date().toISOString(),
    };

    console.log("[dashboard/stats] ✅ 统计数据加载成功", result);

    return res.status(200).json(result);

  } catch (error: any) {
    console.error("[dashboard/stats] 加载失败", {
      userId: session.user.id,
      error: error?.message || error,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: "服务器错误",
      message: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
}

/**
 * 获取本周开始日期（周一）
 */
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}


