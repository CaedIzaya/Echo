import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";
import { computeWeeklyReport, formatDateKey, getAnchoredWeekRange } from "~/lib/weeklyReport";

const REPORT_HOUR_LOCAL = 8;
const REPORT_DAYS = 7;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getSendAt(periodStart: Date) {
  const sendAt = addDays(startOfDay(periodStart), REPORT_DAYS);
  sendAt.setHours(REPORT_HOUR_LOCAL, 0, 0, 0);
  return sendAt;
}

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
    const userId = session.user.id;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user?.createdAt) {
      return res.status(400).json({ error: "用户注册时间缺失" });
    }

    const anchorStart = startOfDay(user.createdAt);
    const latestReport = await db.weeklyReport.findFirst({
      where: { userId },
      orderBy: { weekStart: "desc" },
      select: { weekStart: true },
    });

    let candidateStart = latestReport?.weekStart
      ? addDays(startOfDay(latestReport.weekStart), REPORT_DAYS)
      : anchorStart;

    let lastDueStart: Date | null = null;
    let nextSendAt = getSendAt(candidateStart);
    const now = new Date();

    while (now.getTime() >= nextSendAt.getTime()) {
      lastDueStart = candidateStart;
      candidateStart = addDays(candidateStart, REPORT_DAYS);
      nextSendAt = getSendAt(candidateStart);
    }

    if (!lastDueStart) {
      return res.status(200).json({
        success: true,
        shouldSend: false,
        nextSendAt: nextSendAt.toISOString(),
        anchorStart: anchorStart.toISOString(),
      });
    }

    const { start: periodStart, end: periodEnd } = getAnchoredWeekRange(lastDueStart);
    const report = await computeWeeklyReport(userId, {
      periodStart,
      persist: true,
    });

    const weekStartStr = formatDateKey(periodStart);
    const weekEndStr = formatDateKey(periodEnd);
    const mailId = `weekly_report_${weekStartStr}`;
    const mailRecord = await db.mail.upsert({
      where: { id: mailId },
      update: {
        title: `本周节奏回顾 · ${report.period.label}`,
        content:
          "你的本周节奏回顾已生成。点击查看本周出现过的片段与收尾卡片。",
        date: formatDateKey(new Date()),
        isRead: false,
        type: "report",
        sender: "Echo 周回顾",
        actionUrl: `/reports/weekly?weekStart=${weekStartStr}`,
        actionLabel: "查看周报",
        expiresAt: addDays(periodEnd, 84),
      },
      create: {
        id: mailId,
        userId,
        title: `本周节奏回顾 · ${report.period.label}`,
        content:
          "你的本周节奏回顾已生成。点击查看本周出现过的片段与收尾卡片。",
        date: formatDateKey(new Date()),
        isRead: false,
        type: "report",
        sender: "Echo 周回顾",
        actionUrl: `/reports/weekly?weekStart=${weekStartStr}`,
        actionLabel: "查看周报",
        expiresAt: addDays(periodEnd, 84),
      },
    });

    const mail = {
      id: mailRecord.id,
      sender: mailRecord.sender,
      title: mailRecord.title,
      content: mailRecord.content,
      date: mailRecord.date,
      isRead: mailRecord.isRead,
      type: "report" as const,
      hasAttachment: false,
      actionUrl: mailRecord.actionUrl ?? undefined,
      actionLabel: mailRecord.actionLabel ?? undefined,
      expiresAt: mailRecord.expiresAt ? mailRecord.expiresAt.toISOString() : undefined,
    };

    return res.status(200).json({
      success: true,
      shouldSend: true,
      period: { start: weekStartStr, end: weekEndStr },
      mail,
      reportSummary: {
        totalMinutes: report.presence.totalMinutes,
        daysPresent: report.presence.daysPresent,
        rhythmTitle: report.cover.rhythmTitle,
      },
    });
  } catch (error: any) {
    console.error("[weekly-report/auto] 生成失败:", error);
    return res.status(500).json({ error: "服务器错误" });
  }
}

