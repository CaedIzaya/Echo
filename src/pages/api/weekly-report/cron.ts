import { NextApiRequest, NextApiResponse } from "next";
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

function getLastDueStart(anchorStart: Date, now: Date) {
  let candidateStart = anchorStart;
  let lastDue: Date | null = null;
  let nextSendAt = getSendAt(candidateStart);

  while (now.getTime() >= nextSendAt.getTime()) {
    lastDue = candidateStart;
    candidateStart = addDays(candidateStart, REPORT_DAYS);
    nextSendAt = getSendAt(candidateStart);
  }

  return lastDue;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const secret = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "未授权" });
  }

  try {
    const users = await db.user.findMany({
      select: { id: true, createdAt: true },
    });

    const now = new Date();
    let generated = 0;
    let skipped = 0;

    for (const user of users) {
      if (!user.createdAt) {
        skipped += 1;
        continue;
      }

      const anchorStart = startOfDay(user.createdAt);
      const latestReport = await db.weeklyReport.findFirst({
        where: { userId: user.id },
        orderBy: { weekStart: "desc" },
        select: { weekStart: true },
      });

      const lastDueStart = latestReport?.weekStart
        ? getLastDueStart(startOfDay(latestReport.weekStart), now)
        : getLastDueStart(anchorStart, now);

      if (!lastDueStart) {
        skipped += 1;
        continue;
      }

      const { start: periodStart, end: periodEnd } = getAnchoredWeekRange(lastDueStart);
      const report = await computeWeeklyReport(user.id, {
        periodStart,
        persist: true,
      });

      const weekStartStr = formatDateKey(periodStart);
      const mailId = `weekly_report_${weekStartStr}`;

      await db.mail.upsert({
        where: { id: mailId },
        update: {
          title: `本周专注周报 · ${report.period.label}`,
          content:
            "您的本周专注周报已生成~ 点击下方按钮查看详情。\n\n回顾这一周的专注时光，看看自己的成长与变化。",
          date: formatDateKey(new Date()),
          isRead: false,
          type: "report",
          sender: "Echo 周报",
          actionUrl: `/reports/weekly?weekStart=${weekStartStr}`,
          actionLabel: "查看周报",
          expiresAt: addDays(periodEnd, 84),
        },
        create: {
          id: mailId,
          userId: user.id,
          title: `本周专注周报 · ${report.period.label}`,
          content:
            "您的本周专注周报已生成~ 点击下方按钮查看详情。\n\n回顾这一周的专注时光，看看自己的成长与变化。",
          date: formatDateKey(new Date()),
          isRead: false,
          type: "report",
          sender: "Echo 周报",
          actionUrl: `/reports/weekly?weekStart=${weekStartStr}`,
          actionLabel: "查看周报",
          expiresAt: addDays(periodEnd, 84),
        },
      });

      generated += 1;
    }

    return res.status(200).json({ success: true, generated, skipped });
  } catch (error: any) {
    console.error("[weekly-report/cron] 生成失败:", error);
    return res.status(500).json({ error: "服务器错误" });
  }
}

