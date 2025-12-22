import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";

/**
 * 完整数据同步 API
 * 
 * 目的：从数据库加载所有关键数据，覆盖 localStorage
 * 使用：用户登录时调用，确保数据一致性
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
    console.log('[sync-all-data] 开始同步用户数据:', session.user.id);

    // 1. 加载用户基础数据
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        userExp: true,
        userLevel: true,
        heartTreeName: true,
        heartTreeLevel: true,
        heartTreeTotalExp: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }

    // 2. 加载成就数据
    const achievements = await db.achievement.findMany({
      where: { userId: session.user.id },
      select: {
        achievementId: true,
        category: true,
        unlockedAt: true,
      },
      orderBy: { unlockedAt: 'desc' },
    });

    // 3. 加载专注记录（用于计算统计数据）
    const focusSessions = await db.focusSession.findMany({
      where: { userId: session.user.id },
      select: {
        duration: true,
        startTime: true,
      },
      orderBy: { startTime: 'desc' },
    });

    // 4. 计算统计数据
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getWeekStart();

    // 今日统计
    const todaySessions = focusSessions.filter(s => 
      s.startTime.toISOString().split('T')[0] === today
    );
    const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);

    // 本周统计
    const weekSessions = focusSessions.filter(s => 
      s.startTime >= new Date(weekStart)
    );
    const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);

    // 累计统计
    const totalMinutes = focusSessions.reduce((sum, s) => sum + s.duration, 0);
    const totalSessions = focusSessions.length;

    // 5. 判断是否为新用户
    const accountAge = Date.now() - user.createdAt.getTime();
    const isOldAccount = accountAge > 24 * 60 * 60 * 1000; // 大于24小时
    const hasAnyData = totalMinutes > 0 || achievements.length > 0 || user.userExp > 0;
    
    const isReallyNewUser = !isOldAccount && !hasAnyData;

    // 6. 返回完整数据
    const syncData = {
      // 用户基础数据
      userId: user.id,
      email: user.email,
      userExp: user.userExp,
      userLevel: user.userLevel,
      createdAt: user.createdAt.toISOString(),
      
      // 心树数据
      heartTreeName: user.heartTreeName,
      heartTreeLevel: user.heartTreeLevel,
      heartTreeTotalExp: user.heartTreeTotalExp,
      
      // 成就数据
      achievements: achievements.map(a => a.achievementId),
      achievementDetails: achievements,
      
      // 统计数据
      todayStats: {
        minutes: todayMinutes,
        sessions: todaySessions.length,
        date: today,
      },
      weeklyStats: {
        totalMinutes: weekMinutes,
        sessions: weekSessions.length,
        weekStart: weekStart,
      },
      totalStats: {
        totalMinutes,
        totalSessions,
      },
      
      // 元数据
      isReallyNewUser,
      isOldAccount,
      hasAnyData,
      syncedAt: new Date().toISOString(),
    };

    console.log('[sync-all-data] 同步完成:', {
      userId: user.id,
      achievements: achievements.length,
      totalMinutes,
      isNewUser: isReallyNewUser,
    });

    return res.status(200).json(syncData);

  } catch (error: any) {
    console.error("[sync-all-data] 同步失败:", {
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
function getWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 调整为周一
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}




