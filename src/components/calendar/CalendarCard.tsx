import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface DaySummary {
  date: string;
  preview: string;
  hasSummary: boolean;
  totalFocusMinutes: number;
}

interface CalendarCardProps {
  userId?: string;
}

/**
 * 日历卡片组件 - 蓝色主题
 * 展示本月专注记录的日历视图
 */
export default function CalendarCard({ userId }: CalendarCardProps) {
  const router = useRouter();
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());

  // 加载本月数据
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadMonthData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/journal/month?year=${currentYear}&month=${currentMonth}`
        );

        if (response.ok) {
          const data = await response.json();
          setSummaries(data.summaries || []);
        } else {
          console.warn('[CalendarCard] 加载月度数据失败');
          setSummaries([]);
        }
      } catch (error) {
        console.error('[CalendarCard] 加载失败:', error);
        setSummaries([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMonthData();
  }, [userId, currentYear, currentMonth]);

  // UI: 只展示有记录的日期（星星），不展示空白
  const recordedDays = summaries
    .filter(s => s.hasSummary)
    .sort((a, b) => a.date.localeCompare(b.date));

  // UI: 最多显示 10 颗星，左旧右新
  const visibleStars = recordedDays.slice(-10);

  // 统计本月专注数据
  const monthStats = {
    totalDays: summaries.filter(s => s.hasSummary).length,
    totalMinutes: summaries.reduce((sum, s) => sum + (s.totalFocusMinutes || 0), 0),
  };

  // 处理卡片点击 - 跳转到完整日历页面
  const handleCardClick = () => {
    router.push('/journal');
  };

  const formatMonthDay = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}.${day}`;
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-gradient-to-b from-[#050816] via-[#0B1B3B] to-[#1E3A8A] rounded-3xl p-6 shadow-lg shadow-black/40 text-slate-100 hover:scale-[1.02] transition-all duration-300 cursor-pointer relative overflow-hidden"
    >
      {/* UI: 深色渐变背景，不添加装饰星 */}
      
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-200/70 font-medium">星空日历</p>
        <div className="text-xs text-slate-400/70">
          {currentMonth}月
        </div>
      </div>
      
      <div className="space-y-4 relative z-10">
        {/* 月度统计 */}
        {!isLoading && monthStats.totalDays > 0 ? (
          <>
            <div className="flex items-baseline gap-3">
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-slate-100">{monthStats.totalDays}</p>
                <span className="text-sm opacity-70">天</span>
              </div>
              <div className="flex items-baseline gap-1 text-slate-300/70">
                <p className="text-xl font-semibold">{Math.floor(monthStats.totalMinutes / 60)}</p>
                <span className="text-xs">小时</span>
              </div>
            </div>
            <p className="text-xs text-slate-300/70">
              你的点点滴滴，都在这片星空里面
            </p>
            
            {/* UI: 星轨预览（最多 10 颗） */}
            <div className="flex items-end justify-between gap-3">
              {visibleStars.map((day) => {
                return (
                  <div key={day.date} className="group flex flex-col items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 scale-50 transition-all duration-700 group-hover:opacity-100 group-hover:scale-150" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-100" />
                    </div>
                    <div className="text-[10px] font-light text-white/70">
                      {formatMonthDay(day.date)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/70 mb-2"></div>
            <p className="text-sm text-white/60">加载中...</p>
          </div>
        ) : (
          <div className="py-2">
            <p className="text-lg font-semibold text-white/90 mb-2">这个月还没有专注记录</p>
            <p className="text-sm text-white/60">点击开始你的专注旅程</p>
          </div>
        )}
      </div>

      {/* 查看更多指示 */}
      <div className="mt-3 flex items-center justify-end gap-1 text-xs text-white/60 hover:text-white/80 transition-colors">
        <span>查看完整日历</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}







