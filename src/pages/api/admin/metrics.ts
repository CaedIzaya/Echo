/**
 * /api/admin/metrics
 *
 * 内部指标聚合接口。用简单的 secret token 保护。
 * 请求时需携带请求头：Authorization: Bearer <METRICS_SECRET>
 * 或查询参数：?secret=<METRICS_SECRET>
 *
 * 环境变量 METRICS_SECRET 未设置时，所有请求均拒绝。
 *
 * 返回 JSON 快照，包含：
 *   - funnel：欢迎页漏斗（最近 7 / 30 天）
 *   - retention：D1 / D7 / D30 留存率
 *   - echoMetrics：Echo 特色五项指标
 *   - topFeatures：功能按 WAU 排名
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '~/server/db';

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function daysAgoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return getDateKey(d);
}

/** 生成最近 N 天的 dateKey 数组 */
function recentDateKeys(n: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    keys.push(daysAgoKey(i));
  }
  return keys;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const secret = process.env.METRICS_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'Metrics endpoint not configured' });
  }

  const authHeader = req.headers.authorization ?? '';
  const querySecret = typeof req.query.secret === 'string' ? req.query.secret : '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : querySecret;

  if (provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [funnel7, funnel30, retention, echoMetrics, topFeatures] = await Promise.all([
      buildFunnel(7),
      buildFunnel(30),
      buildRetention(),
      buildEchoMetrics(),
      buildTopFeatures(),
    ]);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      funnel: { last7Days: funnel7, last30Days: funnel30 },
      retention,
      echoMetrics,
      topFeatures,
    });
  } catch (error) {
    console.error('[admin/metrics]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/* ─── 漏斗指标 ─── */
async function buildFunnel(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceKey = getDateKey(since);

  const [landingPv, ctaClicks, emailSubmits, signups, activated, qualified] = await Promise.all([
    // 欢迎页访问（page_view on landing feature）
    db.event.count({
      where: { name: 'page_view', feature: 'landing', dateKey: { gte: sinceKey } },
    }),
    // CTA 点击
    db.event.count({
      where: { name: 'landing_cta_click', dateKey: { gte: sinceKey } },
    }),
    // 邮箱提交
    db.event.count({
      where: { name: 'landing_email_submit', dateKey: { gte: sinceKey } },
    }),
    // 注册用户
    db.user.count({
      where: { createdAt: { gte: since } },
    }),
    // 完成首次专注（用 activatedAt 字段）
    db.user.count({
      where: { activatedAt: { gte: since } },
    }),
    // 首次达标专注
    db.user.count({
      where: { qualityActivatedAt: { gte: since } },
    }),
  ]);

  return {
    landingPageViews: landingPv,
    ctaClicks,
    emailSubmits,
    signups,
    firstFocusActivated: activated,
    firstQualifiedFocused: qualified,
    ctaConversionRate: landingPv > 0 ? +(ctaClicks / landingPv * 100).toFixed(1) : null,
    signupRate: ctaClicks > 0 ? +(signups / ctaClicks * 100).toFixed(1) : null,
    activationRate: signups > 0 ? +(activated / signups * 100).toFixed(1) : null,
  };
}

/* ─── 留存指标 ─── */
async function buildRetention() {
  const cohorts = [1, 7, 30];
  const result: Record<string, number | null> = {};

  for (const n of cohorts) {
    const cohortStart = new Date();
    cohortStart.setDate(cohortStart.getDate() - n - 7);
    const cohortEnd = new Date();
    cohortEnd.setDate(cohortEnd.getDate() - n);

    // 取这个注册时间窗口内的用户
    const cohortUsers = await db.user.findMany({
      where: { createdAt: { gte: cohortStart, lt: cohortEnd } },
      select: { id: true },
    });

    if (cohortUsers.length === 0) {
      result[`D${n}`] = null;
      continue;
    }

    const userIds = cohortUsers.map((u) => u.id);
    const returnKey = daysAgoKey(0); // 今天
    const windowStart = daysAgoKey(n);

    // 在 D+n 附近活跃的用户
    const retained = await db.dailyUserActivity.count({
      where: {
        userId: { in: userIds },
        dateKey: { gte: windowStart, lte: returnKey },
        active: true,
      },
    });

    // 去重（一个用户算一次）
    const retainedUniq = await db.dailyUserActivity.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        dateKey: { gte: windowStart, lte: returnKey },
        active: true,
      },
    });

    result[`D${n}`] = +((retainedUniq.length / cohortUsers.length) * 100).toFixed(1);
  }

  return result;
}

/* ─── Echo 特色五项指标 ─── */
async function buildEchoMetrics() {
  const [
    frictionRatio,
    reEngagementRate,
    lumiConversionRate,
    rhythmStabilityRate,
    companionDepthRate,
  ] = await Promise.all([
    calcFrictionRatio(),
    calcReEngagementRate(),
    calcLumiConversionRate(),
    calcRhythmStabilityRate(),
    calcCompanionDepthRate(),
  ]);

  return {
    frictionRatio: {
      label: '启动效率比',
      description: '有专注行为的会话 / Dashboard 访问会话',
      value: frictionRatio,
    },
    reEngagementRate: {
      label: '回归率',
      description: '7 天以上沉默后重新回来使用的用户比例（不惩罚设计的验证）',
      value: reEngagementRate,
    },
    lumiConversionRate: {
      label: 'Lumi 计划转化率',
      description: 'Lumi 对话后创建计划的用户 / 开启 Lumi 对话的用户',
      value: lumiConversionRate,
    },
    rhythmStabilityRate: {
      label: '回心稳定率',
      description: '注册 30 天以上且 streakDays >= 5 的用户比例',
      value: rhythmStabilityRate,
    },
    companionDepthRate: {
      label: '陪伴深度',
      description: 'WAU 中使用了 3+ 个功能的用户比例',
      value: companionDepthRate,
    },
  };
}

/** 指标1：启动效率比 —— 最近 30 天，有专注的日活 / 总日活 */
async function calcFrictionRatio(): Promise<number | null> {
  const sinceKey = daysAgoKey(30);

  const [totalActive, focusActive] = await Promise.all([
    db.dailyUserActivity.count({
      where: { dateKey: { gte: sinceKey }, active: true },
    }),
    db.dailyFocusStats.count({
      where: { dateKey: { gte: sinceKey }, focusSessionCount: { gt: 0 } },
    }),
  ]);

  if (totalActive === 0) return null;
  return +((focusActive / totalActive) * 100).toFixed(1);
}

/** 指标2：回归率 —— 在最近 90 天内，有 7+ 天沉默后重新活跃的用户比例 */
async function calcReEngagementRate(): Promise<number | null> {
  const sinceKey = daysAgoKey(90);

  // 获取所有在此区间内有活动的用户及其日期列表
  const activityRows = await db.dailyUserActivity.findMany({
    where: { dateKey: { gte: sinceKey }, active: true },
    select: { userId: true, dateKey: true },
    orderBy: { dateKey: 'asc' },
  });

  if (activityRows.length === 0) return null;

  // 按 userId 分组
  const byUser = new Map<string, string[]>();
  for (const row of activityRows) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row.dateKey);
    byUser.set(row.userId, list);
  }

  let usersWithGap = 0;
  let usersWhoReturned = 0;

  for (const [, dates] of byUser) {
    const sorted = [...new Set(dates)].sort();
    if (sorted.length < 2) continue;

    let hadGap = false;
    let returned = false;

    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]!);
      const curr = new Date(sorted[i]!);
      const diffDays = (curr.getTime() - prev.getTime()) / 86400000;

      if (diffDays >= 7) {
        hadGap = true;
        returned = true;
        break;
      }
    }

    if (hadGap) usersWithGap++;
    if (returned) usersWhoReturned++;
  }

  if (usersWithGap === 0) return null;
  return +((usersWhoReturned / usersWithGap) * 100).toFixed(1);
}

/** 指标3：Lumi 计划转化率 —— 有 lumi_plan_created 的用户 / 有 lumi_session_start 的用户 */
async function calcLumiConversionRate(): Promise<number | null> {
  const [sessionStarters, planCreators] = await Promise.all([
    db.event.groupBy({
      by: ['userId'],
      where: { name: 'lumi_session_start', userId: { not: null } },
    }),
    db.event.groupBy({
      by: ['userId'],
      where: { name: 'lumi_plan_created', userId: { not: null } },
    }),
  ]);

  if (sessionStarters.length === 0) return null;
  return +((planCreators.length / sessionStarters.length) * 100).toFixed(1);
}

/** 指标4：回心稳定率 —— 注册 30 天以上且 streakDays >= 5 的用户 / 所有注册 30 天以上的用户 */
async function calcRhythmStabilityRate(): Promise<number | null> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 30);

  const [total, stable] = await Promise.all([
    db.user.count({
      where: { createdAt: { lte: threshold } },
    }),
    db.user.count({
      where: { createdAt: { lte: threshold }, streakDays: { gte: 5 } },
    }),
  ]);

  if (total === 0) return null;
  return +((stable / total) * 100).toFixed(1);
}

/** 指标5：陪伴深度 —— 本周使用了 3+ 个 feature 的用户 / WAU */
async function calcCompanionDepthRate(): Promise<number | null> {
  const sinceKey = daysAgoKey(7);

  // 获取近 7 天每个用户使用的 feature 集合
  const rows = await db.featureUsageDaily.groupBy({
    by: ['userId', 'feature'],
    where: { dateKey: { gte: sinceKey } },
  });

  if (rows.length === 0) return null;

  const featuresByUser = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = featuresByUser.get(row.userId) ?? new Set<string>();
    set.add(row.feature);
    featuresByUser.set(row.userId, set);
  }

  const wau = featuresByUser.size;
  let deepUsers = 0;
  for (const features of featuresByUser.values()) {
    if (features.size >= 3) deepUsers++;
  }

  return +((deepUsers / wau) * 100).toFixed(1);
}

/* ─── 功能排名 ─── */
async function buildTopFeatures() {
  const sinceKey = daysAgoKey(7);

  const rows = await db.featureUsageDaily.groupBy({
    by: ['feature'],
    where: { dateKey: { gte: sinceKey } },
    _count: { userId: true },
    orderBy: { _count: { userId: 'desc' } },
  });

  // 同时取各功能的独立用户数（WAU 维度）
  const uniqueUserRows = await db.featureUsageDaily.groupBy({
    by: ['feature', 'userId'],
    where: { dateKey: { gte: sinceKey } },
  });

  const uniqueByFeature = new Map<string, number>();
  for (const row of uniqueUserRows) {
    uniqueByFeature.set(row.feature, (uniqueByFeature.get(row.feature) ?? 0) + 1);
  }

  return rows.map((r) => ({
    feature: r.feature,
    totalSessions: r._count.userId,
    uniqueUsers: uniqueByFeature.get(r.feature) ?? 0,
  }));
}
