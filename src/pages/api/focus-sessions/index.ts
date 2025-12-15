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
    if (!body.startTime) {
      return res.status(400).json({ error: "startTime 必填" });
    }

    const start = new Date(body.startTime);
    const end = body.endTime ? new Date(body.endTime) : new Date();
    const duration =
      body.duration ??
      Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

    const flowIndex = clamp(body.flowIndex ?? body.rating ?? 70, 0, 100);
    const expEarned = body.expEarned ?? Math.max(0, Math.round(duration / 5));

    const created = await db.focusSession.create({
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

    await refreshDailySummary(session.user.id, start);

    return res.status(200).json({ focusSession: created });
  } catch (error) {
    console.error("保存专注会话失败", error);
    return res.status(500).json({ error: "服务器错误" });
  }
}

async function refreshDailySummary(userId: string, date: Date) {
  const dateKey = formatDateKey(date);
  const dayStart = new Date(dateKey);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

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

  const existing = await db.dailySummary.findUnique({
    where: { userId_date: { userId, date: dateKey } },
  });

  await db.dailySummary.upsert({
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
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

