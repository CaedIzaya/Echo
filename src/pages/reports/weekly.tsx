import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { db } from "~/server/db";
import { computeWeeklyReport, formatDateKey } from "~/lib/weeklyReport";
import type { WeeklyReportPayload } from "~/lib/weeklyReport";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import localforage from "localforage";
import { useEffect } from "react";

type Props = {
  report: WeeklyReportPayload | null;
  expired: boolean;
  requestedWeekStart: string | null;
  error?: string;
  isCurrentWeek: boolean;
  navigation: {
    hasPrev: boolean;
    hasNext: boolean;
    prevWeekStart: string | null;
    nextWeekStart: string | null;
  };
};

enum PageState {
  COVER = 0,
  PRESENCE = 1,
  SNIPPETS = 2,
  CLOSING = 3,
}

const WeeklyReportPage = ({
  report,
  expired,
  requestedWeekStart,
  error,
  isCurrentWeek,
  navigation,
}: Props) => {
  const router = useRouter();
  const [page, setPage] = useState<PageState>(PageState.COVER);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  useEffect(() => {
    localforage
      .getItem<string>("echo-avatar-v1")
      .then((avatar) => setLocalAvatar(avatar ?? null))
      .catch(() => setLocalAvatar(null));
  }, []);

  const avatarSrc = useMemo(() => {
    if (!report) return null;
    return localAvatar ?? report.user.image ?? "/Echo Icon2.png";
  }, [localAvatar, report]);

  const goWeek = (weekStart: string | null) => {
    if (!weekStart) return;
    router.push(`/reports/weekly?weekStart=${weekStart}`);
  };

  if (error) {
    return (
      <>
        <Head>
          <title>周报暂不可用</title>
        </Head>
        <Shell>
          <SimpleCard
            title="周报暂不可用"
            desc={error}
            primary={<Link href="/reports/weekly">重试</Link>}
            secondary={<Link href="/dashboard">返回主页</Link>}
          />
        </Shell>
      </>
    );
  }

  if (expired) {
    return (
      <>
        <Head>
          <title>周报已归档</title>
        </Head>
        <Shell>
          <SimpleCard
            title="这份周报已归档"
            desc={
              requestedWeekStart
                ? `你打开的是 ${requestedWeekStart} 对应周期。我们目前保留最近 12 周。`
                : "我们目前保留最近 12 周。"
            }
            primary={<Link href="/reports/weekly">查看最近周报</Link>}
            secondary={<Link href="/dashboard">返回主页</Link>}
          />
        </Shell>
      </>
    );
  }

  if (!report) return null;

  const next = () => setPage((prev) => Math.min(prev + 1, PageState.CLOSING));

  return (
    <>
      <Head>
        <title>Echo 周回顾</title>
      </Head>
      <Shell>
        <div className="w-full p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <button
                onClick={() => goWeek(navigation.prevWeekStart)}
                disabled={!navigation.hasPrev}
                className="rounded-full border border-slate-700 px-3 py-1 disabled:opacity-40"
              >
                上一周
              </button>
              <button
                onClick={() => goWeek(navigation.nextWeekStart)}
                disabled={!navigation.hasNext}
                className="rounded-full border border-slate-700 px-3 py-1 disabled:opacity-40"
              >
                下一周
              </button>
            </div>
            {!isCurrentWeek && (
              <button
                onClick={() => router.push("/reports/weekly")}
                className="rounded-full border border-teal-700 px-3 py-1 text-teal-300"
              >
                返回当前周
              </button>
            )}
          </div>

          <div className="relative mx-auto h-[86vh] w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800/60 bg-[#0B101A]/70 shadow-2xl">
            <div className="absolute left-0 right-0 top-4 z-40 flex justify-center gap-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`h-0.5 rounded-full transition-all duration-500 ${
                    idx === page ? "w-6 bg-slate-300" : "w-1 bg-slate-700"
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {page === PageState.COVER && (
                <PageWrap key="cover">
                  <div className="absolute left-1/2 top-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-teal-900/20 blur-[80px]" />
                  <div className="mt-14 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Echo Weekly</p>
                    <div className="mx-auto mt-8 h-24 w-24 overflow-hidden rounded-full border border-slate-700/60">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-slate-700 to-slate-800" />
                      )}
                    </div>
                    <h1 className="mx-auto mt-8 max-w-sm text-3xl font-semibold leading-relaxed text-slate-100">
                      {report.cover.rhythmTitle}
                    </h1>
                    <p className="mt-3 px-8 text-sm leading-relaxed text-slate-400">
                      {report.cover.subtitle}
                    </p>
                    <p className="mt-6 text-xs text-slate-500">{report.period.label}</p>
                  </div>
                  <button
                    onClick={next}
                    className="mb-8 mt-auto text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300"
                  >
                    开始回看
                  </button>
                </PageWrap>
              )}

              {page === PageState.PRESENCE && (
                <PageWrap key="presence">
                  <div className="pt-16">
                    <h2 className="text-2xl leading-relaxed text-slate-100">
                      这一周，
                      <br />
                      <span className="text-slate-400">你在这里出现过。</span>
                    </h2>
                  </div>
                  <div className="mt-10 w-full space-y-4">
                    <FactCard title="出现天数" value={`${report.presence.daysPresent} 天`} hint="只是出现，也很重要" />
                    <FactCard
                      title="累计专注"
                      value={`${report.presence.totalHours} 小时`}
                      hint={`${report.presence.totalMinutes} 分钟`}
                    />
                    <FactCard title="常见时段" value={report.presence.peakTime} hint="你更常在这个时段回来" />
                  </div>
                  <div className="mt-10 w-full border-l border-slate-700/60 pl-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {report.presence.narrativeDayLabel ?? "这一周的一段"}
                    </p>
                    <p className="mt-2 text-base leading-relaxed text-slate-300">“{report.presence.narrative}”</p>
                  </div>
                  <button
                    onClick={next}
                    className="mb-5 mt-auto text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300"
                  >
                    继续
                  </button>
                </PageWrap>
              )}

              {page === PageState.SNIPPETS && (
                <PageWrap key="snippets">
                  <h2 className="pt-16 text-xs uppercase tracking-[0.2em] text-slate-500">本周片段</h2>
                  <div className="mt-8 w-full space-y-7">
                    {report.snippets.map((snippet) => (
                      <div key={snippet.id} className="relative border-l border-slate-700/60 pl-5">
                        <div className="absolute -left-[3px] top-1.5 h-1.5 w-1.5 rounded-full bg-slate-600" />
                        {snippet.dateLabel && <p className="text-xs text-slate-500">{snippet.dateLabel}</p>}
                        <p className="mt-1 text-lg leading-relaxed text-slate-200">{snippet.content}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={next}
                    className="mb-5 mt-auto text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300"
                  >
                    收尾
                  </button>
                </PageWrap>
              )}

              {page === PageState.CLOSING && (
                <PageWrap key="closing">
                  <div className="mx-auto mt-auto max-w-sm text-center">
                    <p className="text-2xl leading-relaxed text-slate-200">{report.closingNote}</p>
                    <p className="mt-4 text-sm text-slate-500">Echo 会一直在这里。</p>
                  </div>
                  <div className="mb-8 mt-auto flex flex-col items-center gap-3">
                    <Link
                      href="/dashboard"
                      className="rounded-full border border-slate-700 bg-slate-800/40 px-6 py-3 text-sm text-slate-200 hover:bg-slate-800/70"
                    >
                      返回主页
                    </Link>
                    <button
                      onClick={() => setPage(PageState.COVER)}
                      className="text-xs uppercase tracking-[0.18em] text-slate-500 hover:text-slate-300"
                    >
                      重新查看
                    </button>
                  </div>
                </PageWrap>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Shell>
    </>
  );
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[#0B101A] text-slate-200">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] to-[#0c0a09]" />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center">{children}</main>
    </div>
  );
}

function SimpleCard({
  title,
  desc,
  primary,
  secondary,
}: {
  title: string;
  desc: string;
  primary: React.ReactNode;
  secondary: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
      <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{desc}</p>
      <div className="mt-8 flex gap-3 text-sm">
        <span className="rounded-full border border-slate-700 px-4 py-2">{primary}</span>
        <span className="rounded-full border border-slate-700 px-4 py-2">{secondary}</span>
      </div>
    </div>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.98 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col px-7 pb-6"
    >
      {children}
    </motion.div>
  );
}

function FactCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-1 text-xl text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

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

    const TTL_DAYS = 84;
    const MAX_HISTORY_WEEKS = 4;
    const weekStartParamRaw = ctx.query.weekStart;
    const weekStartParam = typeof weekStartParamRaw === "string" ? weekStartParamRaw : null;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true },
    });
    if (!user?.createdAt) {
      return {
        props: {
          report: null,
          expired: false,
          requestedWeekStart: null,
          error: "用户注册时间缺失",
          isCurrentWeek: false,
          navigation: { hasPrev: false, hasNext: false, prevWeekStart: null, nextWeekStart: null },
        },
      };
    }

    const anchorStart = startOfDay(user.createdAt);
    const latestReport = await db.weeklyReport.findFirst({
      where: { userId: session.user.id },
      orderBy: { weekStart: "desc" },
      select: { weekStart: true },
    });
    const now = new Date();
    const lastDueStart = latestReport?.weekStart
      ? startOfDay(new Date(latestReport.weekStart))
      : getLastDueStart(anchorStart, now);
    const currentPeriodStart = lastDueStart ?? anchorStart;
    const currentPeriodStartStr = formatDateKey(currentPeriodStart);

    if (weekStartParam) {
      const requested = new Date(weekStartParam);
      const threshold = new Date(now);
      threshold.setDate(threshold.getDate() - TTL_DAYS);
      if (requested.getTime() < threshold.getTime()) {
        return {
          props: {
            report: null,
            expired: true,
            requestedWeekStart: weekStartParam,
            isCurrentWeek: false,
            navigation: { hasPrev: false, hasNext: false, prevWeekStart: null, nextWeekStart: null },
          },
        };
      }
    }

    const periodStart = weekStartParam ? new Date(weekStartParam) : currentPeriodStart;
    const report = sanitizeForJson(
      await computeWeeklyReport(session.user.id, {
        periodStart,
        persist: false,
      }),
    );

    const reportWeekStart = report.period.start.split("T")[0];
    const isCurrentWeek = reportWeekStart === currentPeriodStartStr;

    const reportWeekDate = new Date(reportWeekStart);
    const prevWeekDate = addDays(reportWeekDate, -7);
    const nextWeekDate = addDays(reportWeekDate, 7);
    const prevWeekStart = formatDateKey(prevWeekDate);
    const nextWeekStart = formatDateKey(nextWeekDate);

    const oldestAllowedDate = addDays(currentPeriodStart, -(MAX_HISTORY_WEEKS * 7));
    const hasPrev = prevWeekDate.getTime() >= oldestAllowedDate.getTime();
    const hasNext = nextWeekDate.getTime() <= currentPeriodStart.getTime();

    return {
      props: {
        report,
        expired: false,
        requestedWeekStart: weekStartParam,
        isCurrentWeek,
        navigation: {
          hasPrev,
          hasNext,
          prevWeekStart: hasPrev ? prevWeekStart : null,
          nextWeekStart: hasNext ? nextWeekStart : null,
        },
      },
    };
  } catch (error: any) {
    return {
      props: {
        report: null,
        expired: false,
        requestedWeekStart: null,
        error: process.env.NODE_ENV === "development" ? error?.message || "未知错误" : "周报生成失败，请稍后重试",
        isCurrentWeek: false,
        navigation: { hasPrev: false, hasNext: false, prevWeekStart: null, nextWeekStart: null },
      },
    };
  }
};

function sanitizeForJson<T>(value: T): T {
  if (value === undefined) return null as unknown as T;
  if (value === null) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeForJson(item)) as unknown as T;
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

export default WeeklyReportPage;

