import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";
import { formatDateKey } from "~/lib/weeklyReport";

type FocusPayload = {
  startTime: string;
  endTime?: string;
  duration?: number; // minutes
  note?: string;
  rating?: number;
  projectId?: string;
  flowIndex?: number;
  expEarned?: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "未授权" });
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

    const flowIndex = clamp(body.flowIndex ?? body.rating ?? 70, 0, 100);
    const expEarned = body.expEarned ?? Math.max(0, Math.round(duration / 5));

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
          projectId: body.projectId,
        },
      });

      console.log("[focus-sessions] 专注会话保存成功", { id: focusSession.id });
      return focusSession;
    });

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


