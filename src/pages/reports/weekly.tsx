import Head from "next/head";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import type { WeeklyReportPayload } from "~/lib/weeklyReport";
import { computeWeeklyReport } from "~/lib/weeklyReport";
import { useEffect, useMemo, useState } from "react";
import localforage from "localforage";

type Props = {
  report: WeeklyReportPayload | null;
  expired: boolean;
  requestedWeekStart: string | null;
  error?: string;
};

const WeeklyReportPage = ({ report, expired, requestedWeekStart, error }: Props) => {
  if (error) {
    // 判断是否是第一周保护错误
    const isFirstWeekProtection = error.includes("注册时间不足");
    const bgColor = isFirstWeekProtection 
      ? "from-blue-50 via-white to-indigo-50" 
      : "from-red-50 via-white to-orange-50";
    const accentColor = isFirstWeekProtection ? "blue" : "red";
    
    return (
      <>
        <Head>
          <title>{isFirstWeekProtection ? "周报尚未开放" : "周报加载失败"}</title>
        </Head>
        {_weeklyReportMotionStyle}
        <div className={`min-h-screen bg-gradient-to-br ${bgColor} pb-20 relative overflow-hidden`}>
          <div className={`pointer-events-none absolute -top-24 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-${accentColor}-200/60 via-${accentColor === "blue" ? "indigo" : "orange"}-200/50 to-${accentColor === "blue" ? "purple" : "yellow"}-200/40 blur-3xl opacity-80 translate-x-1/3 animate-float-slow`} />
          <div className={`pointer-events-none absolute -bottom-24 left-0 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-${accentColor}-200/60 via-${accentColor === "blue" ? "indigo" : "orange"}-200/40 to-${accentColor === "blue" ? "purple" : "yellow"}-200/40 blur-3xl opacity-70 -translate-x-1/3 animate-float-slower`} />

          <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-16 relative">
            <div className="rounded-[2rem] bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_20px_60px_-40px_rgba(59,130,246,0.45)] overflow-hidden p-8">
              <div className={`inline-flex items-center gap-2 rounded-full bg-white/90 border border-${accentColor}-100 px-4 py-2 shadow-sm`}>
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${accentColor}-400 opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 bg-${accentColor}-500`} />
                </span>
                <span className={`text-sm font-semibold text-${accentColor}-700`}>
                  {isFirstWeekProtection ? "还差几天" : "加载失败"}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-bold text-slate-900 tracking-tight">
                {isFirstWeekProtection ? "周报即将解锁" : "周报加载失败"}
              </h1>
              <p className="mt-2 text-slate-600 leading-relaxed">
                {error}
              </p>
              {isFirstWeekProtection && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-sm text-blue-700 leading-relaxed">
                    💡 提示：为了生成有意义的周报，我们需要至少一周的数据。继续专注吧，很快就能看到第一份周报了！
                  </p>
                </div>
              )}
              {!isFirstWeekProtection && process.env.NODE_ENV === "development" && (
                <p className="mt-4 text-xs text-slate-400 font-mono bg-slate-50 p-3 rounded-lg">
                  {error}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {!isFirstWeekProtection && (
                  <Link
                    href="/reports/weekly"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-black transition"
                  >
                    重试
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white transition"
                >
                  返回主页
                </Link>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (expired) {
    return (
      <>
        <Head>
          <title>周报已过期</title>
        </Head>
        {_weeklyReportMotionStyle}
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 pb-20 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-emerald-200/60 via-cyan-200/50 to-sky-200/40 blur-3xl opacity-80 translate-x-1/3 animate-float-slow" />
          <div className="pointer-events-none absolute -bottom-24 left-0 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-teal-200/60 via-emerald-200/40 to-cyan-200/40 blur-3xl opacity-70 -translate-x-1/3 animate-float-slower" />

          <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-16 relative">
            <div className="rounded-[2rem] bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_20px_60px_-40px_rgba(16,185,129,0.45)] overflow-hidden p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-emerald-100 px-4 py-2 shadow-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="text-sm font-semibold text-emerald-700">
                  周报已归档
                </span>
                <span className="text-xs text-slate-400">保存 12 周</span>
              </div>

              <h1 className="mt-4 text-3xl font-bold text-slate-900 tracking-tight">
                这份周报已过期
              </h1>
              <p className="mt-2 text-slate-600 leading-relaxed">
                {requestedWeekStart
                  ? `你尝试打开的周报周一为 ${requestedWeekStart}。我们只保留最近 12 周的周报。`
                  : "我们只保留最近 12 周的周报。"}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/reports/weekly"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-black transition"
                >
                  查看本周周报
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white transition"
                >
                  返回主页
                </Link>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (!report) return null;

  const maxMinutes = Math.max(...report.daily.map((d) => d.minutes), 1);
  const userLabel = report.user.name ?? "旅行者";
  const flowLabel =
    report.totals.flowAvg === null ? "—" : String(report.totals.flowAvg);
  const streakBadge = report.totals.isNewStreakRecord ? "新纪录" : "继续保持";
  const wowBadge = formatWowBadge(report.totals.wowChange);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const avatar = await localforage.getItem<string>("echo-avatar-v1");
        if (avatar) setLocalAvatar(avatar);
      } catch (error) {
        console.error("Failed to load local avatar:", error);
      }
    };
    loadAvatar();
  }, []);

  const avatarSrc = useMemo(() => {
    return localAvatar ?? report.user.image ?? null;
  }, [localAvatar, report.user.image]);

  return (
    <>
      <Head>
        <title>本周专注周报</title>
      </Head>
      {_weeklyReportMotionStyle}
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 pb-20 relative overflow-hidden">
        {/* 背景光晕：模仿首页的现代感氛围 */}
        <div className="pointer-events-none absolute -top-24 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-emerald-200/60 via-cyan-200/50 to-sky-200/40 blur-3xl opacity-80 translate-x-1/3 animate-float-slow" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-teal-200/60 via-emerald-200/40 to-cyan-200/40 blur-3xl opacity-70 -translate-x-1/3 animate-float-slower" />

        <main className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 relative">
          {/* Hero 卡片：更“生机/动感/现代” */}
          <header className="rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_20px_60px_-40px_rgba(16,185,129,0.55)] overflow-hidden">
            <div className="relative p-6 sm:p-8">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80" />
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white/90 border border-slate-200 overflow-hidden shadow-sm">
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={userLabel}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-emerald-200 to-cyan-200" />
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.45em] text-slate-400">
                            WEEKLY REPORT
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {userLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-emerald-100 px-4 py-2 shadow-sm">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                    <span className="text-sm font-semibold text-emerald-700">
                      周报 · {report.period.label}
                    </span>
                    <span className="text-xs text-slate-400">每周一 06:00 投递</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                    我的本周专注周报
                  </h1>
                  <p className="text-slate-600 leading-relaxed">
                    这七天，你把注意力一点点找回来了。
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600/80 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100/70">
                      本周 {wowBadge}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-600/80 bg-cyan-50 px-3 py-1.5 rounded-full border border-cyan-100/70">
                      连胜 {report.totals.streakDays} 天 · {streakBadge}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  <QuickStat
                    title="本周总时长"
                    value={`${(report.totals.minutes / 60).toFixed(1)} h`}
                    badge={formatWowBadge(report.totals.wowChange)}
                    accent="from-teal-500 to-cyan-600"
                  />
                  <QuickStat
                    title="本周升级"
                    value={`${report.totals.userLevelUp > 0 ? `+${report.totals.userLevelUp}` : "+0"} 级`}
                    badge={`心树 +${report.totals.heartTreeLevelUp} 级`}
                    accent="from-orange-500 to-amber-500"
                  />
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="本周总时长"
              value={`${(report.totals.minutes / 60).toFixed(1)} 小时`}
              badge={formatWowBadge(report.totals.wowChange)}
              variant="teal"
            />
            <KpiCard
              title="连胜天数"
              value={`${report.totals.streakDays} 天`}
              badge={report.totals.isNewStreakRecord ? "新纪录" : "继续保持"}
              variant="cyan"
            />
            <KpiCard
              title="心树升级"
              value={`+${report.totals.heartTreeLevelUp} 级`}
              badge={`EXP ${report.totals.treeExp ?? 0}`}
              variant="emerald"
            />
            <KpiCard
              title="等级升级"
              value={`+${report.totals.userLevelUp} 级`}
              badge={`EXP ${report.totals.selfExp ?? 0}`}
              variant="indigo"
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="group rounded-[2rem] bg-white/80 backdrop-blur-xl p-5 shadow-sm ring-1 ring-white/70 border border-slate-100/60 hover:shadow-[0_25px_60px_-35px_rgba(14,165,233,0.35)] transition-all hover:-translate-y-0.5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  每日专注时长 & 心流
                </h3>
                <span className="text-sm text-slate-500">
                  柱状：分钟 · 点：心流
                </span>
              </div>
              <div className="flex items-end gap-3 overflow-x-auto pb-2">
                {report.daily.map((day) => {
                  const height = Math.max(8, (day.minutes / maxMinutes) * 180);
                  return (
                    <div
                      key={day.date}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="relative flex flex-col items-center gap-2">
                        <div
                          className="w-8 rounded-xl bg-gradient-to-b from-teal-400 via-sky-500 to-blue-600 shadow-[0_18px_40px_-26px_rgba(59,130,246,0.8)] transition-transform duration-300 group-hover:scale-[1.02]"
                          style={{ height }}
                          title={`${day.minutes} 分钟`}
                        />
                        {day.flowIndex !== null ? (
                          <div
                            className="h-2.5 w-2.5 rounded-full border-2 border-white bg-orange-500 shadow-[0_0_0_3px_rgba(249,115,22,0.25)]"
                            title={`心流 ${day.flowIndex}`}
                          />
                        ) : null}
                      </div>
                      <span className="text-xs text-slate-600">
                        {formatDay(day.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white/80 backdrop-blur-xl p-5 shadow-sm ring-1 ring-white/70 border border-slate-100/60 hover:shadow-[0_25px_60px_-35px_rgba(16,185,129,0.25)] transition-all hover:-translate-y-0.5">
              <h3 className="text-lg font-semibold text-slate-900">
                最佳日小结
              </h3>
              {report.bestDay ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-slate-500">
                    {formatDateLabel(report.bestDay.date)} ·{" "}
                    {(report.bestDay.minutes / 60).toFixed(1)} 小时
                  </p>
                  <p className="text-base leading-relaxed text-slate-800">
                    {report.bestDay.note ?? "暂无小结"}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">本周暂无专注记录</p>
              )}
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-orange-500 shadow-[0_0_0_3px_rgba(249,115,22,0.25)]" />
                <span>那天你专注了很久，是灵感迸发了吗？</span>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white transition"
            >
              <span>←</span>
              <span>返回主页</span>
            </Link>
            <div className="text-xs text-slate-500">这份周报，适合截图留念。</div>
          </div>
        </main>
      </div>
    </>
  );
};

function KpiCard({
  title,
  value,
  badge,
  variant = "teal",
}: {
  title: string;
  value: string | number;
  badge?: string;
  variant?: "teal" | "cyan" | "emerald" | "indigo";
}) {
  const variantStyle = {
    teal: "from-teal-500 to-cyan-600 shadow-teal-500/20 border-teal-100/60",
    cyan: "from-cyan-500 to-sky-600 shadow-cyan-500/20 border-cyan-100/60",
    emerald:
      "from-emerald-500 to-teal-600 shadow-emerald-500/20 border-emerald-100/60",
    indigo:
      "from-indigo-500 to-fuchsia-600 shadow-indigo-500/20 border-indigo-100/60",
  }[variant];

  return (
    <div className="group relative overflow-hidden rounded-[2rem] border bg-white/80 backdrop-blur-xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_60px_-35px_rgba(2,132,199,0.35)] border-white/80">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80" />
      <div
        className={`rounded-2xl bg-gradient-to-br ${variantStyle} p-4 text-white shadow-lg`}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-white/80">
          {title}
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
        {badge ? (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white/95 border border-white/20">
            {badge}
          </span>
        ) : (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80 border border-white/15">
            今日也要轻盈一点
          </span>
        )}
      </div>
    </div>
  );
}

function QuickStat({
  title,
  value,
  badge,
  accent,
}: {
  title: string;
  value: string;
  badge: string;
  accent: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <div
        className={`absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl group-hover:opacity-30 transition-opacity`}
      />
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
        {badge}
      </p>
    </div>
  );
}

function formatDelta(value?: number | null, label?: string) {
  if (value === undefined || value === null) return "—";
  const pct = (value * 100).toFixed(0);
  return `${label ?? "变化"} ${value >= 0 ? "+" : ""}${pct}%`;
}

function formatWowBadge(value: number | null) {
  if (value === null) return "较上周 · 无对比";
  const pct = Math.abs(value * 100).toFixed(0);
  if (value === 0) return "较上周 · 0%";
  return value > 0 ? `较上周 · +${pct}%` : `较上周 · -${pct}%`;
}

function formatDay(date: string) {
  if (date.length <= 3) return date;
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateLabel(date: string) {
  const d = new Date(date);
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  try {
    const session = await getServerSession(ctx.req, ctx.res, authOptions);
    if (!session?.user?.id) {
      return {
        redirect: {
          destination: "/auth/signin",
          permanent: false,
        },
      };
    }

    const TTL_DAYS = 84; // 12 周
    const weekStartParamRaw = ctx.query.weekStart;
    const weekStartParam =
      typeof weekStartParamRaw === "string" ? weekStartParamRaw : null;

    if (weekStartParam) {
      const requested = new Date(weekStartParam);
      const now = new Date();
      const threshold = new Date(now);
      threshold.setDate(threshold.getDate() - TTL_DAYS);
      if (requested.getTime() < threshold.getTime()) {
        return {
          props: {
            report: null,
            expired: true,
            requestedWeekStart: weekStartParam,
          },
        };
      }
    }

    const referenceDate = weekStartParam ? new Date(weekStartParam) : undefined;
    const report = sanitizeForJson(
      await computeWeeklyReport(session.user.id, {
        referenceDate,
        persist: false,
      }),
    );

    return {
      props: { report, expired: false, requestedWeekStart: weekStartParam },
    };
  } catch (error: any) {
    console.error("[weekly-report] getServerSideProps error:", error);
    console.error("[weekly-report] error message:", error?.message);
    console.error("[weekly-report] error stack:", error?.stack);
    
    // 返回错误页面而不是直接抛出 500
    return {
      props: {
        report: null,
        expired: false,
        requestedWeekStart: null,
        error: process.env.NODE_ENV === "development" 
          ? error?.message || "未知错误" 
          : "周报生成失败，请稍后重试",
      },
    };
  }
};

export default WeeklyReportPage;

function sanitizeForJson<T>(value: T): T {
  if (value === undefined) return null as unknown as T;
  if (value === null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForJson(item)) as unknown as T;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    Object.keys(obj).forEach((key) => {
      next[key] = sanitizeForJson(obj[key]);
    });
    return next as unknown as T;
  }
  return value;
}

// 页面级动效：更轻量（CSS），更接近你首页那种“活力感”
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _weeklyReportMotionStyle = (
  <style jsx global>{`
    @keyframes floatSlow {
      0%,
      100% {
        transform: translate3d(30%, 0, 0);
      }
      50% {
        transform: translate3d(30%, -12px, 0);
      }
    }
    @keyframes floatSlower {
      0%,
      100% {
        transform: translate3d(-30%, 0, 0);
      }
      50% {
        transform: translate3d(-30%, 16px, 0);
      }
    }
    .animate-float-slow {
      animation: floatSlow 10s ease-in-out infinite;
    }
    .animate-float-slower {
      animation: floatSlower 12s ease-in-out infinite;
    }
  `}</style>
);

