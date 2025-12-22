import React, { useState, useEffect, memo, useMemo } from 'react';

interface TodaySummaryCardProps {
  userId: string;
  // 从 Dashboard 传入的「今日是否有专注」覆盖值（基于 todayStats.minutes）
  hasFocusOverride?: boolean;
}

function TodaySummaryCard({ userId, hasFocusOverride }: TodaySummaryCardProps) {
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
      // 使用客户端（用户本地）时区获取日期，避免服务器UTC时区导致的日期错误
      // 'en-CA' locale 返回 YYYY-MM-DD 格式，符合数据库存储格式
      const localDate = new Date().toLocaleDateString('en-CA');
      
      console.log('[TodaySummaryCard] 查询今日小结，本地日期:', localDate);
      
      const res = await fetch(`/api/daily-summary/today?date=${localDate}`, {
      });

      if (res.ok) {
        const json = await res.json();
        
        // 验证返回的小结日期是否真的是今天的（防御性编程，处理时区问题）
        if (json.todaySummary && json.todaySummary.date) {
          const returnedDate = json.todaySummary.date;
          const expectedDate = new Date().toLocaleDateString('en-CA');
          
          if (returnedDate !== expectedDate) {
            console.warn('[TodaySummaryCard] 返回的小结不是今天的，已过滤', {
              returned: returnedDate,
              expected: expectedDate
            });
            
            // 保留其他数据，但标记为"没有今日小结"
            setData({
              todayHasFocus: json.todayHasFocus,
              todayHasSummary: false,
              todaySummary: null,
              totalFocusMinutes: json.totalFocusMinutes
            });
            return;
          }
        }
        
        setData(json);
      } else {
        // 如果请求失败，但之前已经有数据，就保留原状态，避免界面“回退”
        setData((prev) =>
          prev || {
            todayHasFocus: false,
            todayHasSummary: false,
            todaySummary: null,
            totalFocusMinutes: 0,
          },
        );
      }
    } catch (error) {
      console.error('Failed to fetch summary status', error);
      // 同样，仅在没有任何数据时才使用降级默认值，避免覆盖用户刚看到的内容
      setData((prev) =>
        prev || {
          todayHasFocus: false,
          todayHasSummary: false,
          todaySummary: null,
          totalFocusMinutes: 0,
        },
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // 定时检查日期是否变化（解决跨午夜问题）
    const checkDateChange = () => {
      if (typeof window === 'undefined') return;
      
      const currentDate = new Date().toLocaleDateString('en-CA');
      const lastFetchDate = sessionStorage.getItem('lastSummaryFetchDate');
      
      if (lastFetchDate && lastFetchDate !== currentDate) {
        console.log('[TodaySummaryCard] 检测到日期变化，刷新小结', {
          old: lastFetchDate,
          new: currentDate
        });
        fetchData();
      }
      sessionStorage.setItem('lastSummaryFetchDate', currentDate);
    };
    
    // 每5分钟检查一次
    const interval = setInterval(checkDateChange, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 使用 useMemo 缓存状态判断，避免每次渲染都重新计算
  const hasFocus = useMemo(
    () => (data?.todayHasFocus || false) || !!hasFocusOverride,
    [data?.todayHasFocus, hasFocusOverride]
  );
  
  const hasSummary = useMemo(
    () => !!data?.todayHasSummary,
    [data?.todayHasSummary]
  );

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-48 flex items-center justify-center animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // State 1: 今天没有专注 & 没有小结
  if (!hasFocus && !hasSummary) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-full flex flex-col justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-teal-500 font-medium mb-4">今日小结</p>
          <p className="text-gray-600 text-sm">
            今天还没有专注，有没有兴趣现在开始？
          </p>
        </div>
        <a 
          href="/focus"
          className="w-full mt-4 bg-teal-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors shadow-sm"
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
  if (hasFocus && !hasSummary) {
    return (
      <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-3xl p-6 shadow-lg text-white h-full flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:bg白/20 transition-all"></div>
        
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.4em] text-white/80 font-medium mb-4">今日小结</p>
          <p className="text-teal-100 text-sm">
            你的专注，值得一次小结。
          </p>
        </div>

        <a
          href={`/daily-summary?focusDuration=${data?.totalFocusMinutes ?? 0}`}
          className="relative z-10 w-full mt-4 bg-white text-teal-700 font-semibold py-3 rounded-xl shadow-lg hover:bg-teal-50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          写小结
        </a>
      </div>
    );
  }

  // State 3: 今天已写小结 —— 展示预览 + 继续书写入口
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-full flex flex-col justify-between group hover:shadow-md transition-shadow">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.4em] text-teal-500 font-medium mb-1">今日小结</p>
          </div>
          <span className="bg-teal-100 text-teal-600 text-xs px-2 py-0.5 rounded-full font-medium">
            已保存
          </span>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-2 relative">
           <p className="text-gray-600 text-sm line-clamp-3 italic leading-relaxed">
             "{data?.todaySummary?.text}"
           </p>
        </div>
      </div>

      <a
        href="/daily-summary"
        className="w-full bg-teal-600 text-white font-semibold py-2.5 rounded-xl hover:bg-teal-700 transition-colors text-sm text-center block shadow-sm"
      >
        查看小结
      </a>
    </div>
  );
}

// 使用 React.memo 优化渲染性能，避免父组件更新时不必要的重渲染
export default memo(TodaySummaryCard);
