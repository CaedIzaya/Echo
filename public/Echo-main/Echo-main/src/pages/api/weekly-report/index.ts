import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { computeWeeklyReport } from "~/lib/weeklyReport";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    console.warn("[weekly-report] 未授权访问尝试");
    return res.status(401).json({ error: "未授权" });
  }

  const weekStartParam = req.query.weekStart as string | undefined;
  const preview = req.query.preview === "true";

  try {
    console.log(`[weekly-report] 开始生成周报: userId=${session.user.id}, weekStart=${weekStartParam ?? "本周"}, preview=${preview}`);
    
    const report = await computeWeeklyReport(session.user.id, {
      referenceDate: weekStartParam ? new Date(weekStartParam) : undefined,
      persist: !preview,
    });
    
    console.log(`[weekly-report] 周报生成成功: userId=${session.user.id}, totalMinutes=${report.totals.minutes}`);
    return res.status(200).json({ report });
  } catch (error: any) {
    console.error("[weekly-report] 获取周报失败:", {
      userId: session.user.id,
      weekStart: weekStartParam,
      error: error?.message || error,
      stack: error?.stack,
    });
    
    // 返回更友好的错误信息
    const errorMessage = error?.message || "服务器错误";
    const statusCode = errorMessage.includes("注册时间不足") ? 400 : 500;
    
    return res.status(statusCode).json({ 
      error: errorMessage,
      code: statusCode === 400 ? "INSUFFICIENT_REGISTRATION_TIME" : "SERVER_ERROR"
    });
  }
}


