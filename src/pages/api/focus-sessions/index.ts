import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";
import { dateKeyFromDate, rebuildDailyFocusStats } from "~/lib/dailyFocusStats";
import { formatDateKey } from "~/lib/weeklyReport";
import { computeSessionFlowIndex } from "~/lib/flowEngine";

type FocusPayload = {
  startTime: string;
  endTime?: string;
  duration?: number; // minutes
  note?: string;
  rating?: number;
  projectId?: string;
  flowIndex?: number;
  expEarned?: number;
  goalMinutes?: number;
  isMinMet?: boolean;
  goalSource?: string;
  targetMilestoneId?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "未授权" });
  }

  // 🔥 新增：支持 GET 请求（获取专注记录）
  if (req.method === "GET") {
    try {
      console.log("[focus-sessions] 获取专注记录", { userId: session.user.id });
      
      // 获取查询参数
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // 查询用户的专注记录
      const sessions = await db.focusSession.findMany({
        where: { userId: session.user.id },
        orderBy: { startTime: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          duration: true,
          note: true,
          rating: true,
          flowIndex: true,
          expEarned: true,
          projectId: true,
          createdAt: true,
        },
      });
      
      // 获取总数
      const total = await db.focusSession.count({
        where: { userId: session.user.id },
      });
      
      console.log("[focus-sessions] 查询成功", { 
        userId: session.user.id,
        count: sessions.length,
        total,
      });
      
      return res.status(200).json({ 
        sessions,
        total,
        limit,
        offset,
      });
    } catch (error: any) {
      console.error("[focus-sessions] 获取记录失败", {
        userId: session.user.id,
        error: error?.message || error,
      });
      return res.status(500).json({ 
        error: "服务器错误",
        message: process.env.NODE_ENV === "development" ? error?.message : undefined
      });
    }
  }

  // 🔥 POST 请求：创建专注记录
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许，仅支持 GET 和 POST" });
  }

  try {
    const body = req.body as FocusPayload;
    
    // 数据验证
    if (!body.startTime) {
      console.warn("[focus-sessions] 缺少startTime", { userId: session.user.id });
      return res.status(400).json({ error: "startTime 必填" });
    }

    const start = new Date(body.startTime);
    const end = body.endTime ? new Date(body.endTime) : new Date();
    
    // 验证时间合理性
    if (isNaN(start.getTime())) {
      console.error("[focus-sessions] 无效的startTime", { startTime: body.startTime });
      return res.status(400).json({ error: "无效的开始时间" });
    }
    
    if (body.endTime && isNaN(end.getTime())) {
      console.error("[focus-sessions] 无效的endTime", { endTime: body.endTime });
      return res.status(400).json({ error: "无效的结束时间" });
    }
    
    const duration =
      body.duration ??
      Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

    // 验证持续时间合理性（不超过24小时）
    if (duration > 1440) {
      console.warn("[focus-sessions] 持续时间超过24小时", { duration, userId: session.user.id });
      return res.status(400).json({ error: "专注时长不能超过24小时" });
    }

    const expEarned = body.expEarned ?? Math.max(0, Math.round(duration / 5));

    let goalMinutes = body.goalMinutes;
    let safeProjectId = body.projectId;
    if (body.projectId) {
      const project = await db.project.findFirst({
        where: { id: body.projectId, userId: session.user.id },
        select: { dailyGoalMinutes: true },
      });
      if (!project) {
        return res.status(400).json({ error: "无效的 projectId" });
      }
      if (!goalMinutes) {
        goalMinutes = project.dailyGoalMinutes ?? undefined;
      }
      safeProjectId = body.projectId;
    }
    if (!goalMinutes && !body.projectId) {
      goalMinutes = 30;
    }
    const isMinMet = typeof body.isMinMet === 'boolean'
      ? body.isMinMet
      : typeof goalMinutes === 'number'
        ? duration >= goalMinutes
        : false;
    const explicitFlowIndex =
      typeof body.flowIndex === "number" && Number.isFinite(body.flowIndex) && body.flowIndex > 3
        ? clamp(body.flowIndex, 0, 100)
        : null;
    const flowIndex =
      explicitFlowIndex ??
      computeSessionFlowIndex({
        sessionMinutes: duration,
        rating: body.rating,
        goalMinutes,
        isMinMet,
      });

    console.log("[focus-sessions] 开始保存专注会话", {
      userId: session.user.id,
      duration,
      flowIndex,
      expEarned,
    });

    // 使用事务确保数据一致性
    const created = await db.$transaction(async (tx) => {
      const focusSession = await tx.focusSession.create({
        data: {
          userId: session.user.id,
          startTime: start,
          endTime: body.endTime ? end : null,
          duration,
          note: body.note,
          rating: body.rating ?? flowIndex,
          flowIndex,
          expEarned,
          projectId: safeProjectId,
          goalMinutes: typeof goalMinutes === 'number' ? goalMinutes : null,
          isMinMet,
          goalSource: body.goalSource ?? null,
          targetMilestoneId: body.targetMilestoneId ?? null,
        },
      });

      console.log("[focus-sessions] 专注会话保存成功", { id: focusSession.id });
      return focusSession;
    });

    const dateKey = dateKeyFromDate(start);

    await rebuildDailyFocusStats(db, session.user.id, dateKey);

    // 异步刷新每日小结（不阻塞响应）
    refreshDailySummary(session.user.id, start).catch((err) => {
      console.error("[focus-sessions] 刷新每日小结失败", {
        userId: session.user.id,
        date: formatDateKey(start),
        error: err?.message || err,
      });
    });

    return res.status(200).json({ focusSession: created });
  } catch (error: any) {
    console.error("[focus-sessions] 保存专注会话失败", {
      userId: session.user.id,
      error: error?.message || error,
      stack: error?.stack,
    });
    return res.status(500).json({ 
      error: "服务器错误",
      message: process.env.NODE_ENV === "development" ? error?.message : undefined
    });
  }
}

async function refreshDailySummary(userId: string, date: Date) {
  try {
    const dateKey = formatDateKey(date);
    const dayStart = new Date(dateKey);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    console.log("[refreshDailySummary] 开始刷新每日小结", { userId, dateKey });

    const sessions = await db.focusSession.findMany({
      where: {
        userId,
        startTime: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      select: { duration: true },
    });

    const totalFocusMinutes = sessions.reduce(
      (sum, s) => sum + (s.duration ?? 0),
      0,
    );

    console.log("[refreshDailySummary] 统计完成", { 
      dateKey, 
      sessionsCount: sessions.length, 
      totalFocusMinutes 
    });

    const existing = await db.dailySummary.findUnique({
      where: { userId_date: { userId, date: dateKey } },
    });

    const result = await db.dailySummary.upsert({
      where: { userId_date: { userId, date: dateKey } },
      update: {
        totalFocusMinutes,
        updatedAt: new Date(),
      },
      create: {
        userId,
        date: dateKey,
        text: existing?.text ?? "",
        totalFocusMinutes,
        completedTaskCount: existing?.completedTaskCount ?? 0,
      },
    });

    console.log("[refreshDailySummary] 每日小结更新成功", { 
      id: result.id, 
      totalFocusMinutes: result.totalFocusMinutes 
    });
  } catch (error: any) {
    console.error("[refreshDailySummary] 刷新失败", {
      userId,
      date: formatDateKey(date),
      error: error?.message || error,
      stack: error?.stack,
    });
    // 不抛出错误，避免影响主流程
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
