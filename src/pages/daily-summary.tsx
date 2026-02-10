import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import BottomNavigation from './dashboard/BottomNavigation';
import html2canvas from 'html2canvas';
import SummaryShareCard from '../components/SummaryShareCard';
import localforage from 'localforage';
import { getRandomQuote } from '../lib/quoteLibrary';

export default function DailySummaryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [summary, setSummary] = useState('');
  const [focusDuration, setFocusDuration] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [dateStr, setDateStr] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [streakDays, setStreakDays] = useState(1);
  const [weekFocusDuration, setWeekFocusDuration] = useState(0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [theme, setTheme] = useState<'note' | 'mint'>('note');
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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
        const dayOfWeek = today.getDay() || 7;
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + 1);
        monday.setHours(0, 0, 0, 0);

        let total = 0;
        Object.entries(allStats).forEach(([key, val]: [string, any]) => {
          const itemDate = new Date(key);
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
        const res = await fetch('/api/daily-summary/today');
        if (res.ok) {
          const data = await res.json();
          
          const dbFocusMinutes = data.totalFocusMinutes || 0;
          setFocusDuration(dbFocusMinutes);
          
          if (data.todaySummary) {
            setSummaryId(data.todaySummary.id);
            setSummary(data.todaySummary.text);
            setCompletedTasks(Array.from({ length: data.todaySummary.completedTaskCount }, (_, i) => `任务 ${i + 1}`));
          }
        } else {
          const today = new Date().toISOString().split('T')[0];
          const todayStatsData = localStorage.getItem('todayStats');
          const allTodayStats = todayStatsData ? JSON.parse(todayStatsData) : {};
          const todayStats = allTodayStats[today] || { minutes: 0 };
          setFocusDuration(todayStats.minutes);
        }
      } catch (error) {
        console.error('[DailySummary] ❌ 加载数据失败:', error);
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
    const MAX_CHARS_PER_LINE = 40;
    const MAX_TOTAL_CHARS = 160;

    if (lines.length > MAX_LINES) return;
    
    for (const line of lines) {
      if (line.length > MAX_CHARS_PER_LINE) {
        return;
      }
    }
    
    if (text.length > MAX_TOTAL_CHARS) return;

    setSummary(text);
  };

  const handleRandomMood = () => {
    const randomQuote = getRandomQuote();
    const MAX_LINES = 4;
    const MAX_CHARS_PER_LINE = 40;
    const MAX_TOTAL_CHARS = 160;
    
    const lines = randomQuote.split('\n');
    
    const processedLines = lines.map(line => {
      if (line.length > MAX_CHARS_PER_LINE) {
        return line.substring(0, MAX_CHARS_PER_LINE - 3) + '...';
      }
      return line;
    });
    
    const finalLines = processedLines.slice(0, MAX_LINES);
    
    let finalQuote = finalLines.join('\n');
    if (finalQuote.length > MAX_TOTAL_CHARS) {
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
      const scale = window.devicePixelRatio > 1 ? 2 : 1;
      
      const canvas = await html2canvas(cardRef.current, {
        scale,
        backgroundColor: null,
        logging: false,
        useCORS: true,
      });

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

        URL.revokeObjectURL(url);
        canvas.width = 0;
        canvas.height = 0;
        
        setIsGeneratingImage(false);
      }, 'image/png', 0.92);
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
      prompt('复制链接失败，请手动复制：', urlToCopy);
    }
  };

  useEffect(() => {
    if (step === 2 && summaryId && !shareUrl) {
      handleGenerateShareLink();
    }
  }, [step, summaryId]);

  return (
    <>
      <Head>
        <title>今日小结 | Echo</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 pb-20 relative overflow-hidden">
        {/* 背景装饰泡泡 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-teal-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-emerald-200/25 rounded-full blur-3xl animate-float-slow"></div>
      </div>

      {step === 1 ? (
        <div className="max-w-4xl mx-auto p-6 pt-12 relative z-10">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
             <div>
                <h1 className="text-4xl font-bold text-teal-900 mb-2">今日小结</h1>
                <p className="text-teal-600/70 text-sm">记录此刻，从喧嚣中夺回自我。</p>
             </div>
             <button 
               onClick={() => router.back()} 
               className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm border border-teal-100 flex items-center justify-center text-teal-600 hover:bg-white hover:border-teal-200 transition-all shadow-lg hover:shadow-xl"
             >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
          </div>

          {/* 数据泡泡区域 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 今日专注泡泡 */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/60 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">⏱️</span>
                  <p className="text-xs uppercase tracking-[0.3em] text-teal-600/70 font-bold">今日专注</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold text-teal-900">{focusDuration}</p>
                  <span className="text-lg font-medium text-teal-600">分钟</span>
                </div>
              </div>
            </div>

            {/* 连续专注泡泡 */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/60 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">🔥</span>
                  <p className="text-xs uppercase tracking-[0.3em] text-orange-600/70 font-bold">连续专注</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold text-orange-900">{streakDays}</p>
                  <span className="text-lg font-medium text-orange-600">天</span>
                </div>
              </div>
            </div>

            {/* 本周专注泡泡 */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/60 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">📊</span>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-600/70 font-bold">本周专注</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold text-emerald-900">{weekFocusDuration}</p>
                  <span className="text-lg font-medium text-emerald-600">分钟</span>
                </div>
              </div>
            </div>
          </div>

          {/* 书写区域 - 更大更突出 */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-10 shadow-2xl border border-white/60">
            <div className="space-y-6">
              {/* 标题和随机灵感按钮 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">✍️</span>
                  <h2 className="text-2xl font-bold text-teal-900">写下感悟</h2>
                </div>
                <button
                  type="button"
                  onClick={handleRandomMood}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full transition-all border-2 border-teal-200 hover:border-teal-300 active:scale-95 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <span>随机灵感</span>
                </button>
              </div>
              
              {/* 输入框 - 更大 */}
              <div className="relative group">
                <textarea
                  value={summary}
                  onChange={handleSummaryChange}
                  placeholder="这一刻的想法..."
                  className="w-full rounded-2xl border-2 border-teal-100 bg-teal-50/30 p-8 text-gray-800 placeholder:text-teal-300 focus:border-teal-400 focus:outline-none focus:ring-0 focus:bg-white transition-all resize-none text-lg leading-relaxed min-h-[240px] shadow-inner"
                />
                <div className="absolute bottom-6 right-6 flex flex-col items-end pointer-events-none">
                   <div className={`text-sm font-medium transition-colors ${summary.length > 140 ? 'text-orange-500' : 'text-teal-400'}`}>
                      {summary.length} / 160
                   </div>
                   {summary.split('\n').length > 1 && (
                      <div className="flex gap-1 mt-2">
                         {summary.split('\n').map((line, i) => (
                            <div key={i} className={`h-1.5 w-8 rounded-full ${line.length > 40 ? 'bg-red-400' : 'bg-teal-300'}`} />
                         ))}
                      </div>
                   )}
                </div>
              </div>

              {/* 生成按钮 */}
              <button
                onClick={handleNext}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold py-5 rounded-2xl shadow-xl shadow-teal-500/30 hover:from-teal-600 hover:to-cyan-600 hover:shadow-2xl hover:shadow-teal-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed text-lg"
              >
                {isSaving ? (
                   <>
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>保存中...</span>
                   </>
                ) : (
                   <>
                      <span>生成分享卡片</span>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                   </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full min-h-screen flex flex-col items-center justify-center p-0 md:p-8 relative z-10">
          
          {/* Card Component Preview */}
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

          <div className="flex flex-col gap-4 p-6 md:p-0 md:mt-8 w-full md:max-w-[600px] bg-white/95 md:bg-white/80 backdrop-blur-md rounded-3xl md:rounded-3xl border border-white/60 md:shadow-2xl shadow-lg pb-6 md:pb-8 md:pt-6">
            
            {/* 主题切换器 + 导航图标 */}
            <div className="w-full flex items-center justify-center gap-3 px-4">
              {/* 返回按钮 */}
              <button
                onClick={() => setStep(1)}
                className="w-12 h-12 rounded-full bg-teal-50 backdrop-blur-sm shadow-md border border-teal-200 flex items-center justify-center text-teal-600 hover:bg-teal-100 hover:text-teal-700 transition-all"
                title="上一步"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* 风格切换器 */}
              <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-md border border-teal-100 flex gap-1">
                <button
                  onClick={() => setTheme('note')}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                    theme === 'note' 
                      ? 'bg-amber-100 text-amber-800 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  便签风格
                </button>
                <button
                  onClick={() => setTheme('mint')}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
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
                className="w-12 h-12 rounded-full bg-teal-50 backdrop-blur-sm shadow-md border border-teal-200 flex items-center justify-center text-teal-600 hover:bg-teal-100 hover:text-teal-700 transition-all"
                title="回到主页"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
            </div>

            {/* Save Button */}
            <div className="px-4 space-y-3">
              <button
                onClick={handleSaveImage}
                disabled={isGeneratingImage}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-2xl hover:from-teal-600 hover:to-cyan-600 transition-all py-4 shadow-lg hover:shadow-xl transform active:scale-[0.98] text-base md:text-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
              <p className="text-center text-xs text-teal-600/60">
                为确保最佳视觉效果，建议截屏保存。
              </p>
            </div>
          </div>
        </div>
      )}
      <BottomNavigation active="focus" />

      {/* CSS动画 */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }
        
        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-30px) translateX(-15px);
          }
        }
        
        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-15px) translateX(20px);
          }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
          animation-delay: 4s;
        }
      `}</style>
      </div>
    </>
  );
}
