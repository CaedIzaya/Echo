import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface DaySummary {
  date: string;
  preview: string;
  hasSummary: boolean;
  totalFocusMinutes: number;
}

interface DayDetail {
  date: string;
  hasSummary: boolean;
  summary: {
    text: string;
    totalFocusMinutes: number;
    completedTaskCount: number;
    createdAt?: string;
    updatedAt?: string;
  };
  stats: {
    totalFocusMinutes: number;
    sessionCount: number;
    avgFlowIndex: number | null;
  };
  primaryProject: {
    name: string;
    icon: string;
    dailyGoalMinutes: number;
    completionRate: number;
  } | null;
  sessions: Array<{
    duration: number;
    startTime: string;
    note: string | null;
    flowIndex: number | null;
    projectName?: string;
    projectIcon?: string;
  }>;
}

export default function JournalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // 数据状态
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Drawer状态
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  // UI: 星空分页（按 10 颗一页，0 为最新页）
  const [starPageIndex, setStarPageIndex] = useState(0);

  // 认证检查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
    }
  }, [status, router]);

  // 加载最近 100 天数据
  useEffect(() => {
    if (status === 'authenticated') {
      loadRecentData();
    }
  }, [status]);

  // UI: 数据变化时回到最新页
  useEffect(() => {
    setStarPageIndex(0);
  }, [summaries.length]);

  const loadRecentData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/journal/recent?limit=100`
      );
      
      if (!response.ok) {
        console.warn('加载最近数据失败:', response.status);
        setSummaries([]);
        setError('加载失败，请重试');
        return;
      }

      const data = await response.json();
      setSummaries(data.summaries || []);
    } catch (err) {
      console.error('加载月度数据失败:', err);
      setError('加载失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载某天的详情
  const loadDayDetail = async (date: string) => {
    setIsLoadingDetail(true);
    
    try {
      const response = await fetch(`/api/journal/day?date=${date}`);
      
      if (!response.ok) {
        console.warn('加载日详情失败:', response.status);
        alert('加载详情失败，请重试');
        return;
      }

      const data = await response.json();
      setDayDetail(data);
    } catch (err) {
      console.error('加载日详情失败:', err);
      alert('加载详情失败，请重试');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // 点击某天
  const handleDayClick = (date: string, hasSummary: boolean) => {
    if (!hasSummary) return; // 没有数据的日期不可点击
    
    setSelectedDate(date);
    loadDayDetail(date);
  };

  // 关闭Drawer
  const closeDrawer = () => {
    setSelectedDate(null);
    setDayDetail(null);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B1026] via-[#050a14] to-black flex items-center justify-center text-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60 mx-auto mb-4"></div>
          <p className="text-white/70">加载中...</p>
        </div>
      </div>
    );
  }

  // UI: 只展示有记录的日期（星星），不展示空白
  const recordedDays = summaries
    .filter(s => s.hasSummary)
    .sort((a, b) => b.date.localeCompare(a.date)); // 新的在前

  // UI: 最多显示 10 颗星，左新右旧（按页）
  const totalStars = recordedDays.length;
  const totalStarPages = Math.max(1, Math.ceil(totalStars / 10));
  const maxStarPageIndex = totalStarPages - 1;
  const safeStarPageIndex = Math.min(starPageIndex, maxStarPageIndex);
  const starPageStart = safeStarPageIndex * 10;
  const starPageEnd = Math.min(starPageStart + 10, totalStars);
  const visibleStars = recordedDays.slice(starPageStart, starPageEnd);

  return (
    <>
      <Head>
        <title>日记 | Echo</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-[#050816] via-[#0B1B3B] to-[#1E3A8A] pb-24 text-slate-100">
        {/* UI: 轻微径向暗化，避免渐变断层 */}
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)] opacity-40" />
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-6">
            {/* 标题行 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-9 h-9 rounded-full border border-white/10 text-slate-200 hover:text-white hover:border-white/30 transition flex items-center justify-center"
                  aria-label="回到主页"
                  title="回到主页"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-semibold tracking-[0.2em] text-slate-200">JOURNAL</h1>
                  <p className="text-xs text-slate-400/70 mt-1">慢下来，回顾自己的旅途。</p>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                最近100天
              </div>
            </div>
          </div>
        </div>

        {/* 日历主体 */}
        <div className="max-w-6xl mx-auto px-4 py-6 relative z-10">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={loadRecentData}
                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded transition text-sm"
              >
                重试
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60 mx-auto mb-4"></div>
              <p className="text-white/70">加载日历中...</p>
            </div>
          ) : (
            <div className="bg-transparent p-2">
              {/* UI: 星空时间线（最多 10 颗星） */}
              <div className="flex items-end justify-between gap-6 min-h-[220px]">
                {visibleStars.length === 0 ? (
                  <div className="text-white/40 text-sm tracking-[0.3em] font-light mx-auto py-16">
                    这片星空还没有足迹
                  </div>
                ) : (
                  visibleStars.map((day) => {
                    const d = new Date(day.date);
                    const monthDayLabel = `${d.getMonth() + 1}.${d.getDate()}`;
                    return (
                      <button
                        key={day.date}
                        onClick={() => handleDayClick(day.date, true)}
                        className="group flex flex-col items-center gap-6 transition-all duration-500"
                      >
                        <div className="relative w-14 h-14 flex items-center justify-center">
                          {/* UI: 悬停水波纹 */}
                          <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 scale-50 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-150" />
                          {/* UI: 星点 */}
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-100" />
                        </div>
                        <div className="text-[11px] font-light text-white/70">
                          {monthDayLabel}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              {/* UI: 星空分页按钮 */}
              <div className="mt-10 flex items-center justify-center gap-8">
                <button
                  onClick={() => setStarPageIndex(prev => Math.min(prev + 1, maxStarPageIndex))}
                  disabled={safeStarPageIndex >= maxStarPageIndex}
                  className="w-10 h-10 rounded-full border border-white/10 text-slate-300 hover:text-white hover:border-white/30 transition disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-slate-300"
                  aria-label="上十个"
                >
                  <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setStarPageIndex(prev => Math.max(prev - 1, 0))}
                  disabled={safeStarPageIndex <= 0}
                  className="w-10 h-10 rounded-full border border-white/10 text-slate-300 hover:text-white hover:border-white/30 transition disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-slate-300"
                  aria-label="下十个"
                >
                  <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 详情Drawer */}
        {selectedDate && (
          <DetailDrawer
            date={selectedDate}
            detail={dayDetail}
            isLoading={isLoadingDetail}
            onClose={closeDrawer}
          />
        )}
      </div>
    </>
  );
}

// 详情Drawer组件
interface DetailDrawerProps {
  date: string;
  detail: DayDetail | null;
  isLoading: boolean;
  onClose: () => void;
}

function DetailDrawer({ date, detail, isLoading, onClose }: DetailDrawerProps) {
  // 格式化日期显示
  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${dateStr} ${weekdays[d.getDay()]}`;
  };

  return (
    <>
      {/* UI: 深色遮罩层 */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* UI: 中央详情卡片 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl bg-black/60 border border-white/10 rounded-2xl shadow-2xl p-8 text-slate-100 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center mb-8">
            <div className="text-xs tracking-[0.3em] text-slate-500 uppercase">
              {formatDateDisplay(date)}
            </div>
            <div className="mt-4 w-10 h-px bg-white/10 mx-auto" />
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/60 mx-auto mb-4"></div>
              <p className="text-white/70">加载中...</p>
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* 统计信息 */}
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <div className="text-3xl font-light text-white">
                    {Math.floor(detail.stats.totalFocusMinutes / 60)}
                    <span className="text-base ml-1">h</span>
                    {detail.stats.totalFocusMinutes % 60 > 0 && (
                      <span className="text-base ml-1">{detail.stats.totalFocusMinutes % 60}m</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">专注时长</div>
                </div>
                <div>
                  <div className="text-3xl font-light text-white">{detail.stats.sessionCount}</div>
                  <div className="text-xs text-slate-400 mt-2">专注次数</div>
                </div>
              </div>

              {/* 主要计划 */}
              {detail.primaryProject && (
                <div className="border-t border-white/10 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{detail.primaryProject.icon}</span>
                      <div>
                        <div className="text-sm text-slate-200">{detail.primaryProject.name}</div>
                        <div className="text-xs text-slate-500">
                          目标 {detail.primaryProject.dailyGoalMinutes} 分钟
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm ${
                      detail.primaryProject.completionRate >= 100 ? 'text-emerald-400' : 'text-slate-300'
                    }`}>
                      {detail.primaryProject.completionRate}%
                    </div>
                  </div>
                </div>
              )}

              {/* 小结内容 */}
              {detail.hasSummary && detail.summary.text && (
                <div className="border-t border-white/10 pt-6">
                  <div className="text-xs text-slate-500 tracking-[0.2em] mb-3">今日小结</div>
                  <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {detail.summary.text}
                  </p>
                </div>
              )}

              {/* 专注会话列表 */}
              {detail.sessions.length > 0 && (
                <div className="border-t border-white/10 pt-6">
                  <div className="text-xs text-slate-500 tracking-[0.2em] mb-3">专注记录</div>
                  <div className="space-y-3">
                    {detail.sessions.map((session, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-300">
                          {session.projectIcon && <span>{session.projectIcon}</span>}
                          <span>{session.note || session.projectName || '专注时间'}</span>
                        </div>
                        <div className="text-slate-400">
                          {session.duration} 分钟
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 如果没有任何内容 */}
              {!detail.hasSummary && detail.sessions.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <p>这天没有专注记录</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>加载失败</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

