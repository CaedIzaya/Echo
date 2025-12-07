import React, { useState, useEffect } from 'react';

interface TodaySummaryCardProps {
  userId: string;
}

export default function TodaySummaryCard({ userId }: TodaySummaryCardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    todayHasFocus: boolean;
    todayHasSummary: boolean;
    todaySummary: {
      text: string;
      totalFocusMinutes: number;
      completedTaskCount: number;
    } | null;
    totalFocusMinutes: number;
  } | null>(null);

  // 恢复为完整数据结构，同时保留基础的错误处理
  const fetchData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/daily-summary/today', {
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData({
          todayHasFocus: false,
          todayHasSummary: false,
          todaySummary: null,
          totalFocusMinutes: 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch summary status', error);
      setData({
        todayHasFocus: false,
        todayHasSummary: false,
        todaySummary: null,
        totalFocusMinutes: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-48 flex items-center justify-center animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // State 1: 今天没有专注 & 没有小结
  if (!data?.todayHasFocus && !data?.todayHasSummary) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-full flex flex-col justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-teal-500 font-medium mb-4">今日小结</p>
          <p className="text-gray-500 text-sm">今天还没有专注记录，先完成一次专注吧。</p>
        </div>
        <a 
          href="/focus"
          className="w-full mt-4 bg-teal-50 text-teal-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-teal-100 transition-colors"
        >
          去专注
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>
    );
  }

  // State 2: 今天有专注，但还没有小结
  if (data?.todayHasFocus && !data?.todayHasSummary) {
    return (
      <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-3xl p-6 shadow-lg text-white h-full flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:bg白/20 transition-all"></div>
        
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.4em] text-white/80 font-medium mb-4">今日小结</p>
          <p className="text-teal-100 text-sm">
            今日如此专注，不如写几句给自己？
          </p>
        </div>

        <a
          href={`/daily-summary?focusDuration=${data.totalFocusMinutes}`}
          className="relative z-10 w-full mt-4 bg白 text-teal-600 font-bold py-3 rounded-xl shadow-lg hover:bg-teal-50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          写今日小结
        </a>
      </div>
    );
  }

  // State 3: 今天已写小结 —— 展示预览 + 鼓励文案
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-full flex flex-col justify-between group hover:shadow-md transition-shadow">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.4em] text-teal-500 font-medium mb-1">今日小结</p>
          </div>
          <span className="bg-teal-100 text-teal-600 text-xs px-2 py-0.5 rounded-full font-medium">✓</span>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-2 relative">
           <p className="text-gray-600 text-sm line-clamp-3 italic leading-relaxed">
             "{data?.todaySummary?.text}"
           </p>
        </div>
      </div>

      <a
        href="/daily-summary"
        className="w-full bg-white border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl hover:bg-gray-50 hover:text-teal-600 transition-colors text-sm text-center block"
      >
        查看
      </a>
    </div>
  );
}

