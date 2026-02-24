import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import BottomNavigation from './dashboard/BottomNavigation';
import html2canvas from 'html2canvas';
import SummaryShareCard from '../components/SummaryShareCard';
import localforage from 'localforage';
import { getRandomQuote } from '../lib/quoteLibrary';
import { trackEvent } from '~/lib/analytics';

export default function DailySummaryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [summary, setSummary] = useState('');
  const [focusDuration, setFocusDuration] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [dateStr, setDateStr] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [streakDays, setStreakDays] = useState(1); // 新增状态
  const [weekFocusDuration, setWeekFocusDuration] = useState(0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [theme, setTheme] = useState<'note' | 'mint'>('note');
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    trackEvent({
      name: 'summary_open',
      feature: 'daily_summary',
      page: '/daily-summary',
      action: 'open',
    });

    // Load local avatar
    const loadAvatar = async () => {
        try {
            const avatar = await localforage.getItem<string>('echo-avatar-v1');
            if (avatar) setLocalAvatar(avatar);
        } catch (e) {
            console.error('Failed to load avatar', e);
        }
    };
    loadAvatar();

    // ... existing date logic ...
    const now = new Date();
    setDateStr(now.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      weekday: 'long'
    }));

    // Calculate Week Focus Duration
    const calculateWeekFocus = () => {
      try {
        const todayStatsData = localStorage.getItem('todayStats');
        if (!todayStatsData) return 0;
        
        const allStats = JSON.parse(todayStatsData);
        const today = new Date();
        const dayOfWeek = today.getDay() || 7; // 1 (Mon) - 7 (Sun)
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + 1);
        monday.setHours(0, 0, 0, 0);

        let total = 0;
        Object.entries(allStats).forEach(([key, val]: [string, any]) => {
          const itemDate = new Date(key); // YYYY-MM-DD
          // Reset hours to ensure fair comparison
          itemDate.setHours(0,0,0,0); 
          if (itemDate >= monday) {
            total += (val.minutes || 0);
          }
        });
        return total;
      } catch (e) {
        console.error('Failed to calculate week stats', e);
        return 0;
      }
    };
    setWeekFocusDuration(calculateWeekFocus());

    // Load streak data from localStorage
    const savedStats = localStorage.getItem('dashboardStats');
    if (savedStats) {
      const stats = JSON.parse(savedStats);
      setStreakDays(Math.max(1, stats.streakDays || 1));
    }

    // 🔥 修复：优先从数据库加载今日专注时长
    const loadTodayData = async () => {
      try {
        // 先从API加载（数据库为准）
        const res = await fetch('/api/daily-summary/today');
        if (res.ok) {
          const data = await res.json();
          
          console.log('[DailySummary] 📊 数据库返回:', {
            totalFocusMinutes: data.totalFocusMinutes,
            todaySummary: data.todaySummary?.totalFocusMinutes,
          });
          
          // 使用数据库的实时专注时长
          const dbFocusMinutes = data.totalFocusMinutes || 0;
          setFocusDuration(dbFocusMinutes);
          console.log('[DailySummary] ✅ 使用数据库时长:', dbFocusMinutes, '分钟');
          
          // 如果有保存的小结，加载小结内容
          if (data.todaySummary) {
            setSummaryId(data.todaySummary.id);
            setSummary(data.todaySummary.text);
            setCompletedTasks(Array.from({ length: data.todaySummary.completedTaskCount }, (_, i) => `任务 ${i + 1}`));
          }
        } else {
          // API失败时fallback到localStorage
          const today = new Date().toISOString().split('T')[0];
          const todayStatsData = localStorage.getItem('todayStats');
          const allTodayStats = todayStatsData ? JSON.parse(todayStatsData) : {};
          const todayStats = allTodayStats[today] || { minutes: 0 };
          setFocusDuration(todayStats.minutes);
          console.log('[DailySummary] ⚠️ API失败，使用localStorage:', todayStats.minutes, '分钟');
        }
      } catch (error) {
        console.error('[DailySummary] ❌ 加载数据失败:', error);
        // Fallback
        const params = router.query;
        if (params.focusDuration) {
          setFocusDuration(Number(params.focusDuration));
        }
      }
    };
    loadTodayData();
  }, [router.query]);

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const lines = text.split('\n');
    
    const MAX_LINES = 4;
    const MAX_CHARS_PER_LINE = 40; // 每行最大字符数（根据卡片宽度和字体大小估算）
    const MAX_TOTAL_CHARS = 160; // 总字符数限制

    // 检查行数
    if (lines.length > MAX_LINES) return;
    
    // 检查每行字数
    for (const line of lines) {
      if (line.length > MAX_CHARS_PER_LINE) {
        return; // 如果任何一行超过限制，拒绝输入
      }
    }
    
    // 检查总字符数
    if (text.length > MAX_TOTAL_CHARS) return;

    setSummary(text);
  };

  const handleRandomMood = () => {
    const randomQuote = getRandomQuote();
    const MAX_LINES = 4;
    const MAX_CHARS_PER_LINE = 40;
    const MAX_TOTAL_CHARS = 160;
    
    // 按换行符分割
    const lines = randomQuote.split('\n');
    
    // 处理每行，确保不超过每行字数限制
    const processedLines = lines.map(line => {
      if (line.length > MAX_CHARS_PER_LINE) {
        // 如果单行超过限制，截断并添加省略号
        return line.substring(0, MAX_CHARS_PER_LINE - 3) + '...';
      }
      return line;
    });
    
    // 确保不超过最大行数
    const finalLines = processedLines.slice(0, MAX_LINES);
    
    // 合并并检查总字符数
    let finalQuote = finalLines.join('\n');
    if (finalQuote.length > MAX_TOTAL_CHARS) {
      // 如果总字符数超过限制，从最后一行开始截断
      const charsToRemove = finalQuote.length - MAX_TOTAL_CHARS + 3;
      const lastLineIndex = finalLines.length - 1;
      if (lastLineIndex >= 0) {
        const lastLine = finalLines[lastLineIndex];
        const newLastLine = lastLine.substring(0, Math.max(0, lastLine.length - charsToRemove)) + '...';
        finalLines[lastLineIndex] = newLastLine;
        finalQuote = finalLines.join('\n');
      }
    }
    
    setSummary(finalQuote);
  };

  const saveSummary = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/daily-summary/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: summary,
          totalFocusMinutes: focusDuration,
          completedTaskCount: completedTasks.length
        }),
      });
      const data = await res.json();
      if (data.todaySummary) {
        setSummaryId(data.todaySummary.id);
        trackEvent({
          name: 'summary_save',
          feature: 'daily_summary',
          page: '/daily-summary',
          action: 'save',
          properties: {
            summaryId: data.todaySummary.id,
            totalFocusMinutes: focusDuration,
          },
        });
      }
    } catch (err) {
      console.error('Failed to save summary', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    await saveSummary();
    setStep(2);
  };

  const handleSaveImage = async () => {
    if (!cardRef.current || isGeneratingImage) return;

    setIsGeneratingImage(true);
    try {
      // 根据设备分辨率智能调整质量，降低内存占用
      const scale = window.devicePixelRatio > 1 ? 2 : 1;
      
      const canvas = await html2canvas(cardRef.current, {
        scale,
        backgroundColor: null,
        logging: false, // 关闭日志输出
        useCORS: true,
      });

      // 使用 Blob 而不是 DataURL，更节省内存
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('生成 Blob 失败');
          setIsGeneratingImage(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const today = new Date().toISOString().split('T')[0];

        link.href = url;
        link.download = `Echo-每日小结-${today}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 立即释放内存
        URL.revokeObjectURL(url);
        canvas.width = 0;
        canvas.height = 0;
        
        setIsGeneratingImage(false);
      }, 'image/png', 0.92); // 0.92 质量已经很好，且文件更小
    } catch (error) {
      console.error('生成图片失败', error);
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateShareLink = async (): Promise<string | null> => {
    if (!summaryId || isGeneratingLink) return null;
    
    setIsGeneratingLink(true);
    try {
      const res = await fetch('/api/share-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryId }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setShareUrl(data.shareUrl);
        return data.shareUrl;
      }
    } catch (error) {
      console.error('Failed to generate share link', error);
    } finally {
      setIsGeneratingLink(false);
    }
    return null;
  };

  const handleCopyLink = async () => {
    let urlToCopy = shareUrl;
    
    if (!urlToCopy) {
        urlToCopy = await handleGenerateShareLink() || '';
    }

    if (!urlToCopy) return;

    try {
      const textToCopy = `来看看我的 Echo 每日小结：\n${urlToCopy}`;
      await navigator.clipboard.writeText(textToCopy);
      alert('链接已复制到剪贴板！');
    } catch (err) {
      console.error('Failed to copy', err);
      // Fallback
      prompt('复制链接失败，请手动复制：', urlToCopy);
    }
  };

  useEffect(() => {
    if (step === 2 && summaryId && !shareUrl) {
      handleGenerateShareLink();
    }
  }, [step, summaryId]);

  return (
    <div className="min-h-screen bg-[#F5F7F9] pb-20">
      {step === 1 ? (
        <div className="max-w-2xl mx-auto p-6 pt-12">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
             <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">今日小结</h1>
                <p className="text-gray-500 text-sm">记录此刻，从喧嚣中夺回自我。</p>
             </div>
             <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            
            <div className="p-8 space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Today's Focus */}
                <div className="col-span-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg shadow-teal-500/20 relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="text-teal-100 text-xs font-bold uppercase tracking-wider mb-2">今日专注</div>
                    <div className="flex items-baseline gap-2">
                       <div className="text-5xl font-bold tracking-tight">{focusDuration}</div>
                       <span className="text-lg font-medium text-teal-100">分钟</span>
                    </div>
                  </div>
                  <div className="absolute right-4 bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-1-7h2v2h-2v-2zm0-8h2v6h-2V5z" />
                    </svg>
                  </div>
                </div>

                {/* Streak */}
                <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100/50 flex flex-col justify-between">
                  <div className="text-orange-600/70 text-xs font-bold uppercase tracking-wider">连续专注</div>
                  <div className="text-3xl font-bold text-orange-800 mt-2">{streakDays} <span className="text-sm font-normal text-orange-600">天</span></div>
                </div>

                {/* Weekly */}
                <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100/50 flex flex-col justify-between">
                  <div className="text-indigo-600/70 text-xs font-bold uppercase tracking-wider">本周专注</div>
                  <div className="text-3xl font-bold text-indigo-800 mt-2">{weekFocusDuration} <span className="text-sm font-normal text-indigo-600">分钟</span></div>
                </div>
              </div>

              {/* Input Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    ✍️ 写下感悟
                  </label>
                  <button
                    type="button"
                    onClick={handleRandomMood}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-full transition-all border border-teal-100 hover:border-teal-200 active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <span>随机灵感</span>
                  </button>
                </div>
                
                <div className="relative group">
                  <textarea
                    value={summary}
                    onChange={handleSummaryChange}
                    placeholder="这一刻的想法..."
                    className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 p-5 text-gray-700 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-0 focus:bg-white transition-all resize-none text-base leading-relaxed min-h-[160px] shadow-inner whitespace-pre-wrap"
                  />
                  <div className="absolute bottom-4 right-4 flex flex-col items-end pointer-events-none">
                     <div className={`text-xs font-medium transition-colors ${summary.length > 140 ? 'text-orange-500' : 'text-gray-300'}`}>
                        {summary.length} / 160
                     </div>
                     {summary.split('\n').length > 1 && (
                        <div className="flex gap-1 mt-1">
                           {summary.split('\n').map((line, i) => (
                              <div key={i} className={`h-1 w-6 rounded-full ${line.length > 40 ? 'bg-red-400' : 'bg-gray-200'}`} />
                           ))}
                        </div>
                     )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4">
                <button
                  onClick={handleNext}
                  disabled={isSaving}
                  className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-lg shadow-gray-900/20 hover:bg-black hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                     <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>保存中...</span>
                     </>
                  ) : (
                     <>
                        <span>生成分享卡片</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                     </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full min-h-screen flex flex-col items-center justify-center p-0 md:p-8">
          
          {/* Card Component Preview - 手机端全屏，PC端居中 */}
          <div
            className="w-full flex items-center justify-center mb-6 md:mb-0 transform scale-[0.85] md:scale-100 origin-center"
            ref={cardRef}
          >
            <SummaryShareCard 
              dateStr={dateStr}
              focusDuration={focusDuration}
              completedTasks={completedTasks}
              summary={summary}
              userName={session?.user?.name || '旅行者'}
              streakDays={streakDays}
              avatarUrl={localAvatar}
              theme={theme}
            />
          </div>

          <div className="flex flex-col gap-4 p-6 md:p-0 md:mt-8 w-full md:max-w-[600px] bg-white/95 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none border-t md:border-t-0 border-gray-200 md:shadow-none shadow-lg pb-6">
            
            {/* 主题切换器 + 导航图标 */}
            <div className="w-full flex items-center justify-center gap-3">
              {/* 返回按钮 */}
              <button
                onClick={() => setStep(1)}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-all"
                title="上一步"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* 风格切换器 */}
              <div className="bg-white/90 backdrop-blur-sm p-1 rounded-full shadow-md border border-gray-200 flex gap-1">
                <button
                  onClick={() => setTheme('note')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    theme === 'note' 
                      ? 'bg-amber-100 text-amber-800 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  便签风格
                </button>
                <button
                  onClick={() => setTheme('mint')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    theme === 'mint' 
                      ? 'bg-teal-100 text-teal-800 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  生机风格
                </button>
              </div>

              {/* 主页按钮 */}
              <button
                onClick={() => router.push('/dashboard')}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-all"
                title="回到主页"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveImage}
              disabled={isGeneratingImage}
              className="w-full bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all py-4 shadow-lg hover:shadow-xl transform active:scale-[0.98] text-base md:text-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGeneratingImage ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>保存图片</span>
                </>
              )}
            </button>

            {/* Note */}
            <p className="text-center text-xs text-gray-400">
              为确保最佳视觉效果，建议截屏保存。
            </p>
          </div>
        </div>
      )}
      <BottomNavigation active="focus" />
    </div>
  );
}
