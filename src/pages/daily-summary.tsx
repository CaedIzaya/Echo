import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import BottomNavigation from './dashboard/BottomNavigation';
import html2canvas from 'html2canvas';

// 卡片组件
function SummaryShareCard({ 
  dateStr, 
  focusDuration, 
  completedTasks, 
  summary, 
  userName,
  streakDays // 新增
}: { 
  dateStr: string, 
  focusDuration: number, 
  completedTasks: string[], 
  summary: string, 
  userName: string,
  streakDays?: number // 新增可选
}) {
  // 格式化日期为 "2025 · 01 · 12 星期日" (去除中文，保留完整的星期几)
  // dateStr 格式可能是 "2025年01月12日 星期日"
  const formattedDate = dateStr
    .replace(/(\d+)年(\d+)月(\d+)日\s*(.*)/, (match, year, month, day, weekday) => {
      // 分离日期部分和星期部分，只替换日期中的"日"
      return `${year} · ${month} · ${day} ${weekday}`;
    });
  const previewTasks = completedTasks.slice(0, 3);

  return (
    <div 
      className="w-full h-screen md:w-[600px] md:h-[800px] rounded-none md:rounded-2xl px-6 pb-24 md:pb-12 py-8 md:px-10 md:py-12 shadow-lg md:shadow-lg flex flex-col justify-between relative overflow-hidden"
      style={{
        background: 'rgb(255, 251, 235)', // 便签黄底色
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 0 20px rgba(0,0,0,0.02)' // 添加内阴影增加纸质感
      }}
    >
      {/* 纸质纹理效果 */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.08\'/%3E%3C/svg%3E")' 
        }} 
      />

      {/* 装饰光斑 - 调整颜色适应便签 */}
      <div 
        className="absolute top-[-50px] right-[-50px] w-40 h-40 rounded-full blur-3xl opacity-40"
        style={{ background: 'rgba(251, 146, 60, 0.15)' }} // orange-400
      />
      <div 
        className="absolute bottom-[-20px] left-[-20px] w-32 h-32 rounded-full blur-2xl opacity-40"
        style={{ background: 'rgba(250, 204, 21, 0.15)' }} // yellow-400
      />

      {/* 顶部：日期居中 */}
      <div className="relative z-10 w-full">
        <div className="text-center mb-6 md:mb-8">
          <div className="text-xs md:text-base tracking-[0.25em] font-medium" style={{ color: 'rgb(120, 113, 108)' }}>
            {formattedDate}
          </div>
        </div>

        {/* 顶部左右布局：左侧夺回时间，右侧连胜天数 */}
        <div className="flex justify-between items-end border-b pb-4 md:pb-6" style={{ borderColor: 'rgba(120, 113, 108, 0.1)' }}>
          {/* 左侧：今日已夺回 */}
          <div>
            <div className="text-[10px] md:text-sm tracking-wider font-medium uppercase mb-1 md:mb-2" style={{ color: 'rgb(120, 113, 108)' }}>
              今日已夺回
            </div>
            <span className="text-3xl md:text-5xl font-bold tracking-tight" style={{ color: 'rgb(67, 20, 7)' }}>
              {focusDuration} <span className="text-base md:text-2xl font-normal">分钟</span>
            </span>
          </div>

          {/* 右侧：连胜天数 */}
          <div className="text-right">
            <div className="text-[10px] md:text-sm tracking-wider font-medium uppercase mb-1 md:mb-2" style={{ color: 'rgb(120, 113, 108)' }}>
              连续专注
            </div>
            <span className="text-3xl md:text-5xl font-bold tracking-tight" style={{ color: 'rgb(67, 20, 7)' }}>
              {streakDays || 1} <span className="text-base md:text-2xl font-normal">天</span>
            </span>
          </div>
        </div>
      </div>

      {/* 中部：小结心语 */}
      <div className="flex-1 flex flex-col justify-center relative z-10 px-2">
        {summary && (
          <div className="relative">
            {/* 左上角引号 */}
            <div className="absolute -top-2 -left-1 md:-top-4 md:-left-2 text-4xl md:text-6xl font-serif leading-none" style={{ color: 'rgba(120, 113, 108, 0.2)' }}>
              "
            </div>
            
            <div className="text-base md:text-2xl leading-loose md:leading-relaxed font-medium text-center italic px-4 md:px-8 py-2 md:py-4" style={{ color: 'rgb(67, 20, 7)' }}>
              {summary}
            </div>

            {/* 右下角引号 */}
            <div className="absolute -bottom-4 -right-1 md:-bottom-6 md:-right-2 text-4xl md:text-6xl font-serif leading-none transform rotate-180" style={{ color: 'rgba(120, 113, 108, 0.2)' }}>
              "
            </div>
          </div>
        )}
      </div>

      {/* 署名位置 */}
      <div className="relative z-10 pb-4 md:pb-6 flex justify-end">
        <div className="text-[10px] md:text-sm font-medium" style={{ color: 'rgb(120, 113, 108)' }}>
          — {userName}
        </div>
      </div>

      {/* 底部：Tagline */}
      <div className="relative z-10 pt-4 md:pt-6 mt-2 border-t" style={{ borderColor: 'rgba(120, 113, 108, 0.1)' }}>
        <div className="flex items-center justify-between">
          <div className="text-xs md:text-base tracking-wider" style={{ color: 'rgb(120, 113, 108)' }}>
            算法之外，重遇自我
          </div>
          {/* Echo Logo 在右下角 */}
          <div className="flex items-center gap-1.5 md:gap-2 opacity-80">
             <div className="w-5 h-5 md:w-7 md:h-7">
                <img src="/Echo Icon.png" alt="Lumi" className="w-full h-full object-contain" />
             </div>
             <span className="text-xs md:text-base font-bold tracking-widest uppercase" style={{ color: 'rgb(120, 113, 108)' }}>
               Echo
             </span>
           </div>
        </div>
      </div>
    </div>
  );
}

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
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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

    // Load today's data from query params or localStorage
    const params = router.query;
    if (params.focusDuration) {
      setFocusDuration(Number(params.focusDuration));
    } else {
      // Fallback: get from localStorage
      const today = new Date().toISOString().split('T')[0];
      const todayStatsData = localStorage.getItem('todayStats');
      const allTodayStats = todayStatsData ? JSON.parse(todayStatsData) : {};
      const todayStats = allTodayStats[today] || { minutes: 0 };
      setFocusDuration(todayStats.minutes);
    }

    // Load existing summary if editing
    const loadExistingSummary = async () => {
      try {
        const res = await fetch('/api/daily-summary/today');
        if (res.ok) {
          const data = await res.json();
          if (data.todaySummary) {
            setSummary(data.todaySummary.text);
            setFocusDuration(data.todaySummary.totalFocusMinutes);
            setCompletedTasks(Array.from({ length: data.todaySummary.completedTaskCount }, (_, i) => `任务 ${i + 1}`));
          }
        }
      } catch (error) {
        console.error('Failed to load existing summary', error);
      }
    };
    loadExistingSummary();
  }, [router.query]);

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const lines = text.split('\n');
    
    const MAX_LINES = 4;
    const MAX_CHARS = 160;

    if (lines.length > MAX_LINES) return;
    if (text.length > MAX_CHARS) return;

    setSummary(text);
  };

  const saveSummary = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/daily-summary/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: summary,
          totalFocusMinutes: focusDuration,
          completedTaskCount: completedTasks.length
        }),
      });
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
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];

      link.href = dataUrl;
      link.download = `Echo-每日小结-${today}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('生成图片失败', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 pb-20">
      {step === 1 ? (
        <div className="max-w-2xl mx-auto p-6 pt-12">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-6 text-white">
              <h1 className="text-3xl font-bold mb-2">今日小结</h1>
              <p className="text-teal-100">记录此刻的成就与感悟</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Today's Data & Stats */}
              <div className="grid grid-cols-2 gap-4">
                {/* 夺回时间 - Full Width */}
                <div className="col-span-2 bg-teal-50 rounded-2xl p-4 border border-teal-100 flex items-center justify-between">
                  <div>
                    <div className="text-teal-600 text-xs font-bold uppercase mb-1">今日专注</div>
                    <div className="text-3xl font-bold text-teal-800">{focusDuration} <span className="text-sm font-normal text-teal-600">分钟</span></div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* 连续天数 */}
                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                  <div className="text-orange-600 text-xs font-bold uppercase mb-1">连续专注</div>
                  <div className="text-2xl font-bold text-orange-800">{streakDays} <span className="text-sm font-normal text-orange-600">天</span></div>
                </div>

                {/* 本周专注 */}
                <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                  <div className="text-indigo-600 text-xs font-bold uppercase mb-1">本周专注</div>
                  <div className="text-2xl font-bold text-indigo-800">{weekFocusDuration} <span className="text-sm font-normal text-indigo-600">分钟</span></div>
                </div>
              </div>

              {/* Input Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  写下你的感悟 <span className="text-gray-400 font-normal">(可选)</span>
                </label>
                <div className="relative">
                  <textarea
                    value={summary}
                    onChange={handleSummaryChange}
                    placeholder="今天专注于... 感觉..."
                    className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-100 transition-all resize-none text-base leading-relaxed"
                    rows={4}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none">
                    {summary.length}/160
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleNext}
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-200 hover:shadow-teal-300 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? '保存中...' : '生成分享卡片'}
                </button>
                <button
                  onClick={() => router.back()}
                  className="px-6 bg-white text-gray-500 font-medium py-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-screen md:min-h-screen flex flex-col items-center justify-center p-0 md:p-8 relative">
          {/* Card Component Preview - 手机端全屏，PC端居中 */}
          <div
            className="w-full h-full md:w-auto md:h-auto flex items-center justify-center"
            ref={cardRef}
          >
            <SummaryShareCard 
              dateStr={dateStr}
              focusDuration={focusDuration}
              completedTasks={completedTasks}
              summary={summary}
              userName={session?.user?.name || '旅行者'}
              streakDays={streakDays}
            />
          </div>

          {/* 按钮组 - 手机端固定在底部覆盖层，PC端在卡片外 */}
          <div className="absolute bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto flex flex-col md:flex-row gap-3 md:gap-6 p-4 md:p-0 md:mt-8 w-full md:w-full md:max-w-[600px] bg-white/95 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none border-t md:border-t-0 border-gray-200 md:shadow-none shadow-lg z-50">
            <button
              onClick={handleSaveImage}
              disabled={isGeneratingImage}
              className="w-full md:flex-1 bg-amber-50 text-amber-900 font-medium rounded-2xl hover:bg-amber-100 transition-all py-3 md:py-4 border border-amber-200 hover:border-amber-300 shadow-sm hover:shadow-md text-sm md:text-base flex items-center justify-center gap-2"
            >
              {isGeneratingImage ? (
                <>
                  <svg className="animate-spin h-4 w-4 md:h-5 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>生成图片中…</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>保存图片</span>
                </>
              )}
            </button>
            <div className="flex w-full md:flex-1 gap-3 md:gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-white text-gray-700 font-medium rounded-2xl hover:bg-gray-50 transition-all py-3 md:py-4 border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md text-sm md:text-base"
              >
                上一步
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium rounded-2xl hover:from-teal-600 hover:to-teal-700 transition-all py-3 md:py-4 shadow-md hover:shadow-lg text-sm md:text-base"
              >
                回到主页
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNavigation active="focus" />
    </div>
  );
}

