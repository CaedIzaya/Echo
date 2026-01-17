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
  
  // 当前显示的年月
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  
  // 数据状态
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Drawer状态
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // 认证检查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
    }
  }, [status, router]);

  // 加载月度数据
  useEffect(() => {
    if (status === 'authenticated') {
      loadMonthData();
    }
  }, [status, currentYear, currentMonth]);

  const loadMonthData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/journal/month?year=${currentYear}&month=${currentMonth}`
      );
      
      if (!response.ok) {
        throw new Error('加载失败');
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
        throw new Error('加载详情失败');
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

  // 月份切换
  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToThisMonth = () => {
    setCurrentYear(new Date().getFullYear());
    setCurrentMonth(new Date().getMonth() + 1);
  };

  // 生成日历网格数据
  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay(); // 0-6, 0是周日
    
    const days: Array<{
      date: string;
      dayOfMonth: number;
      isCurrentMonth: boolean;
      summary?: DaySummary;
    }> = [];
    
    // 填充上月的日期（空白）
    for (let i = 0; i < startWeekday; i++) {
      days.push({
        date: '',
        dayOfMonth: 0,
        isCurrentMonth: false,
      });
    }
    
    // 填充本月的日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const summary = summaries.find(s => s.date === dateStr);
      
      days.push({
        date: dateStr,
        dayOfMonth: day,
        isCurrentMonth: true,
        summary,
      });
    }
    
    return days;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-teal-600">加载中...</p>
        </div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays();
  const isCurrentMonthView = currentYear === new Date().getFullYear() && currentMonth === new Date().getMonth() + 1;

  return (
    <>
      <Head>
        <title>日记 | Echo</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 pb-24">
        {/* 顶部导航 */}
        <div className="bg-white/80 backdrop-blur-md border-b border-teal-100 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            {/* 标题行 */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">📔</span>
                  <h1 className="text-2xl font-bold text-teal-900">日记</h1>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="ml-3 px-3 py-1 text-sm bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition flex items-center gap-1"
                    title="返回主页"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    回到主页
                  </button>
                </div>
                <p className="text-sm text-teal-600/70 mt-1 ml-11">慢下来，回顾自己的旅途。</p>
              </div>
              <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                仅保存近期100天小结
              </div>
            </div>
            
            {/* 月份导航 */}
            <div className="flex items-center justify-between">
              <button
                onClick={goToPrevMonth}
                className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                aria-label="上个月"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-teal-900">
                  {currentYear}年{currentMonth}月
                </span>
                {!isCurrentMonthView && (
                  <button
                    onClick={goToThisMonth}
                    className="px-3 py-1 text-sm bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition"
                  >
                    回到本月
                  </button>
                )}
              </div>
              
              <button
                onClick={goToNextMonth}
                className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                aria-label="下个月"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 日历主体 */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={loadMonthData}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded transition text-sm"
              >
                重试
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-teal-600">加载日历中...</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {/* 星期标题 */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => (
                  <div
                    key={i}
                    className="text-center text-sm font-semibold text-teal-600 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 日历网格 */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                  if (!day.isCurrentMonth) {
                    // 空白格子
                    return <div key={index} className="aspect-square" />;
                  }

                  const hasSummary = day.summary?.hasSummary || false;
                  const isToday = day.date === new Date().toISOString().split('T')[0];

                  return (
                    <button
                      key={day.date}
                      onClick={() => handleDayClick(day.date, hasSummary)}
                      disabled={!hasSummary}
                      className={`aspect-square p-2 rounded-xl border-2 transition-all ${
                        isToday
                          ? 'border-teal-500 bg-teal-50'
                          : hasSummary
                          ? 'border-teal-200 bg-white hover:border-teal-400 hover:shadow-md cursor-pointer'
                          : 'border-gray-100 bg-gray-50/50 cursor-default'
                      } ${!hasSummary && !isToday ? 'opacity-50' : ''}`}
                    >
                      <div className="h-full flex flex-col">
                        {/* 日期号 */}
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-semibold ${
                            isToday ? 'text-teal-700' : hasSummary ? 'text-teal-900' : 'text-gray-400'
                          }`}>
                            {day.dayOfMonth}
                          </span>
                          {hasSummary && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          )}
                        </div>
                        
                        {/* 小结摘要 */}
                        {hasSummary && day.summary && (
                          <div className="flex-1 min-h-0">
                            <p className="text-xs text-gray-600 line-clamp-2 text-left leading-tight">
                              {day.summary.preview}
                            </p>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 返回按钮（移动端） */}
        <div className="md:hidden fixed bottom-6 right-6 z-30">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all"
            aria-label="返回主页"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
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
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer内容 */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[480px] bg-white shadow-2xl z-50 overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 shadow-lg z-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">专注回顾</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
              aria-label="关闭"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-teal-100">{formatDateDisplay(date)}</p>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-teal-600">加载中...</p>
            </div>
          ) : detail ? (
            <>
              {/* 统计卡片 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
                  <div className="text-2xl font-bold text-teal-700">
                    {Math.floor(detail.stats.totalFocusMinutes / 60)}
                    <span className="text-base">h</span>
                    {detail.stats.totalFocusMinutes % 60 > 0 && (
                      <span className="text-base ml-1">{detail.stats.totalFocusMinutes % 60}m</span>
                    )}
                  </div>
                  <div className="text-sm text-teal-600 mt-1">专注时长</div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                  <div className="text-2xl font-bold text-emerald-700">{detail.stats.sessionCount}</div>
                  <div className="text-sm text-emerald-600 mt-1">专注次数</div>
                </div>
              </div>

              {/* 主要计划 */}
              {detail.primaryProject && (
                <div className="bg-white rounded-xl p-4 border-2 border-teal-100">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{detail.primaryProject.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-teal-900">{detail.primaryProject.name}</div>
                      <div className="text-sm text-gray-600">
                        目标 {detail.primaryProject.dailyGoalMinutes} 分钟
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        detail.primaryProject.completionRate >= 100 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {detail.primaryProject.completionRate}%
                      </div>
                    </div>
                  </div>
                  {detail.primaryProject.completionRate > 0 && (
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(detail.primaryProject.completionRate, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 小结内容 */}
              {detail.hasSummary && detail.summary.text && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">✨</span>
                    <h3 className="font-semibold text-amber-900">今日小结</h3>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {detail.summary.text}
                  </p>
                </div>
              )}

              {/* 专注会话列表 */}
              {detail.sessions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-teal-900 mb-3 flex items-center gap-2">
                    <span>📋</span>
                    专注记录
                  </h3>
                  <div className="space-y-2">
                    {detail.sessions.map((session, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {session.projectIcon && (
                              <span className="text-lg">{session.projectIcon}</span>
                            )}
                            <span className="font-medium text-gray-900">
                              {session.note || session.projectName || '专注时间'}
                            </span>
                          </div>
                          <span className="text-teal-600 font-semibold">
                            {session.duration} 分钟
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                          <span>
                            {new Date(session.startTime).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {session.flowIndex !== null && (
                            <span>心流 {session.flowIndex}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 如果没有任何内容 */}
              {!detail.hasSummary && detail.sessions.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>这天没有专注记录</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>加载失败</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

