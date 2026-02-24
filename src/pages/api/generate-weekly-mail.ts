import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { computeWeeklyReport, getAnchoredWeekRange, formatDateKey } from "~/lib/weeklyReport";
import { db } from "~/server/db";

/**
 * 生成周报邮件 API
 * 
 * 功能：
 * 1. 生成上周的周报数据
 * 2. 返回邮件信息，供前端 MailSystem 添加
 * 
 * 调用时机：每周一登录时自动调用
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    console.warn("[generate-weekly-mail] 未授权访问尝试");
    return res.status(401).json({ error: "未授权" });
  }

  try {
    // 获取周开始日期（从请求体或自动计算上周一）
    const requestedWeekStart = req.body?.weekStart as string | undefined;
    
    let periodStart: Date;

    if (requestedWeekStart) {
      // 使用指定周期开始日期（支持注册日锚点）
      periodStart = new Date(requestedWeekStart);
      console.log('[generate-weekly-mail] 使用指定周期开始日期:', requestedWeekStart);
    } else {
      // 默认：以上周同一天为周期起点（用于兼容旧行为）
      const today = new Date();
      const lastWeekSameDay = new Date(today);
      lastWeekSameDay.setDate(today.getDate() - 7);
      periodStart = lastWeekSameDay;
      console.log('[generate-weekly-mail] 使用默认周期开始日期（上周同日）:', formatDateKey(lastWeekSameDay));
    }

    const { start: weekStart, end: weekEnd } = getAnchoredWeekRange(periodStart);
    const weekStartStr = formatDateKey(weekStart);
    const weekEndStr = formatDateKey(weekEnd);

    console.log(`[generate-weekly-mail] 生成周报: userId=${session.user.id}, week=${weekStartStr} to ${weekEndStr}`);

    // 生成周报数据（会自动保存到数据库）
    const report = await computeWeeklyReport(session.user.id, {
      periodStart,
      persist: true,
    });

    // 写入数据库邮件（避免跨设备丢失）
    const mailId = `weekly_report_${weekStartStr}`;
    const mailRecord = await db.mail.upsert({
      where: { id: mailId },
      update: {
        title: `本周节奏回顾 · ${report.period.label}`,
        content: `你的本周节奏回顾已生成。点击查看本周出现过的片段与收尾卡片。`,
        date: formatDateKey(new Date()),
        isRead: false,
        type: 'report',
        sender: 'Echo 周回顾',
        actionUrl: `/reports/weekly?weekStart=${weekStartStr}`,
        actionLabel: '查看周报',
        expiresAt: new Date(Date.now() + 84 * 24 * 60 * 60 * 1000),
      },
      create: {
        id: mailId,
        userId: session.user.id,
        title: `本周节奏回顾 · ${report.period.label}`,
        content: `你的本周节奏回顾已生成。点击查看本周出现过的片段与收尾卡片。`,
        date: formatDateKey(new Date()),
        isRead: false,
        type: 'report',
        sender: 'Echo 周回顾',
        actionUrl: `/reports/weekly?weekStart=${weekStartStr}`,
        actionLabel: '查看周报',
        expiresAt: new Date(Date.now() + 84 * 24 * 60 * 60 * 1000),
      },
    });

    // 返回邮件信息（格式符合 MailSystem.Mail 接口）
    const mail = {
      id: `weekly_report_${weekStartStr}`,
      sender: 'Echo 周回顾',
      title: `本周节奏回顾 · ${report.period.label}`,
      content: `你的本周节奏回顾已生成。点击查看本周出现过的片段与收尾卡片。`,
      date: formatDateKey(new Date()), // 今天的日期（邮件发送日期）
      isRead: false,
      type: 'report' as const,
      hasAttachment: false,
      actionUrl: `/reports/weekly?weekStart=${weekStartStr}`,
      actionLabel: '查看周报',
      expiresAt: new Date(Date.now() + 84 * 24 * 60 * 60 * 1000).toISOString(), // 84天后过期
    };

    console.log(`[generate-weekly-mail] ✅ 周报邮件生成成功`);
    console.log(`[generate-weekly-mail]    邮件ID: ${mail.id}`);
    console.log(`[generate-weekly-mail]    标题: ${mail.title}`);
    console.log(`[generate-weekly-mail]    周期: ${weekStartStr} 至 ${weekEndStr}`);
    console.log(
      `[generate-weekly-mail]    数据: ${report.presence.totalMinutes}分钟, ${report.presence.daysPresent}天出现, ${report.cover.rhythmTitle}`,
    );

    return res.status(200).json({ 
      success: true,
      mail,
      reportSummary: {
        totalMinutes: report.presence.totalMinutes,
        daysPresent: report.presence.daysPresent,
        rhythmTitle: report.cover.rhythmTitle,
      }
    });
  } catch (error: any) {
    console.error("[generate-weekly-mail] 生成周报邮件失败:", {
      userId: session.user.id,
      error: error?.message || error,
      stack: error?.stack,
    });
    
    // 如果是"注册时间不足7天"的错误，返回特殊状态码
    const errorMessage = error?.message || "服务器错误";
    const statusCode = errorMessage.includes("注册时间不足") ? 400 : 500;
    
    return res.status(statusCode).json({ 
      error: errorMessage,
      code: statusCode === 400 ? "INSUFFICIENT_REGISTRATION_TIME" : "SERVER_ERROR"
    });
  }
}

