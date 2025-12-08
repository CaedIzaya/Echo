import React from 'react';

// 主题配置
type Theme = 'note' | 'mint';

// 卡片组件
export default function SummaryShareCard({ 
  dateStr, 
  focusDuration, 
  completedTasks, 
  summary, 
  userName,
  streakDays, 
  avatarUrl,
  theme = 'note' // 默认主题
}: { 
  dateStr: string, 
  focusDuration: number, 
  completedTasks: string[], 
  summary: string, 
  userName: string,
  streakDays?: number,
  avatarUrl?: string | null,
  theme?: Theme
}) {
  const formattedDate = dateStr
    .replace(/(\d+)年(\d+)月(\d+)日\s*(.*)/, (match, year, month, day, weekday) => {
      return `${year} · ${month} · ${day} ${weekday}`;
    });

  // 主题样式定义
  // 注意：为了兼容 html2canvas，这里避免使用 oklch 颜色或 Tailwind v4 默认颜色变量
  // 所有的颜色都使用 Hex 或 RGBA 硬编码
  const styles = {
    note: {
      wrapper: {
        background: '#fffbeb', // rgb(255, 251, 235) 便签黄
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 0 20px rgba(0,0,0,0.02)'
      },
      textPrimary: '#431407', // rgb(67, 20, 7) 深棕
      textSecondary: '#78716c', // rgb(120, 113, 108) 灰褐
      divider: 'rgba(120, 113, 108, 0.1)',
      quote: 'rgba(120, 113, 108, 0.2)',
      bgDecor1: 'rgba(251, 146, 60, 0.15)', // Orange
      bgDecor2: 'rgba(250, 204, 21, 0.15)', // Yellow
      fontFamily: '', 
    },
    mint: {
      wrapper: {
        // 使用半透明白色背景模拟毛玻璃效果，移除backdrop-filter以兼容截图
        background: 'rgba(255, 255, 255, 0.4)', // 增加不透明度以弥补模糊缺失
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 30px 60px -12px rgba(20, 184, 166, 0.25), inset 0 0 20px rgba(255,255,255,0.5)'
      },
      textPrimary: '#0f766e', // teal-700
      textSecondary: '#115e59', // teal-800
      divider: 'rgba(20, 184, 166, 0.2)',
      quote: 'rgba(45, 212, 191, 0.3)',
      fontFamily: 'font-sans tracking-wide',
    }
  };

  const currentStyle = styles[theme];
  
  // 优化 Mint 主题的背景渐变
  // 兼容 html2canvas：使用 linear-gradient 替代 conic-gradient
  // 并且显式使用 Hex 颜色，避免 Tailwind 类可能引入的 oklch
  const outerBgStyle = theme === 'mint' 
    ? { background: 'linear-gradient(135deg, #ccfbf1 0%, #cffafe 50%, #d1fae5 100%)' } // teal-100, cyan-100, emerald-100
    : { backgroundColor: '#fffbeb' };

  return (
    <div 
      className="w-full md:w-[600px] md:h-[800px] relative overflow-hidden shadow-lg"
      style={outerBgStyle}
    >
      {/* Mint Theme Background Blobs - 保持动态效果 */}
      {theme === 'mint' && (
         <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
            {/* 使用Hex颜色，确保兼容性。移除 mix-blend-mode，改用 opacity */}
            <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full filter blur-[60px] opacity-40 animate-blob"
                 style={{ backgroundColor: '#a5f3fc' }}></div> {/* Cyan-200 */}
            <div className="absolute top-[10%] right-[-20%] w-[70%] h-[70%] rounded-full filter blur-[60px] opacity-40 animate-blob animation-delay-2000"
                 style={{ backgroundColor: '#5eead4' }}></div> {/* Teal-300 */}
            <div className="absolute bottom-[-20%] left-[10%] w-[70%] h-[70%] rounded-full filter blur-[60px] opacity-40 animate-blob animation-delay-4000"
                 style={{ backgroundColor: '#d1fae5' }}></div> {/* Emerald-100 */}
         </div>
      )}

      <div 
        className={`w-full h-full p-8 md:p-12 flex flex-col justify-between relative ${theme === 'mint' ? currentStyle.fontFamily : ''}`}
        style={currentStyle.wrapper}
      >
        {/* 背景纹理/装饰 (Note Theme Only) */}
        {theme === 'note' && (
          <div 
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{ 
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.08\'/%3E%3C/svg%3E")' 
            }} 
          />
        )}

        {/* 通用装饰光斑 (Note Theme Only) */}
        {theme === 'note' && (
          <>
            <div 
              className="absolute top-[-50px] right-[-50px] w-40 h-40 rounded-full blur-3xl opacity-40"
              style={{ background: currentStyle.bgDecor1 }} 
            />
            <div 
              className="absolute bottom-[-20px] left-[-20px] w-32 h-32 rounded-full blur-2xl opacity-40"
              style={{ background: currentStyle.bgDecor2 }} 
            />
          </>
        )}

        {/* 顶部：日期居中 */}
        <div className="relative z-10 w-full">
          <div className="text-center mb-6 md:mb-8">
            <div className="text-xs md:text-base tracking-[0.25em] font-medium" style={{ color: currentStyle.textSecondary }}>
              {formattedDate}
            </div>
          </div>

          {/* 顶部左右布局 */}
          <div className="flex justify-between items-end border-b pb-4 md:pb-6" style={{ borderColor: currentStyle.divider }}>
            {/* 左侧：今日已夺回 */}
            <div>
              <div className="text-[10px] md:text-sm tracking-wider font-medium uppercase mb-1 md:mb-2" style={{ color: currentStyle.textSecondary }}>
                今日已夺回
              </div>
              {theme === 'mint' ? (
                <span className="text-3xl md:text-5xl font-bold tracking-tight" style={{ color: '#0d9488' }}>
                  {/* 如果 html2canvas 渲染渐变有问题，可以直接使用纯色，或者尝试 text-shadow 模拟立体感 */}
                  {focusDuration}
                  <span className="text-base md:text-2xl font-normal" style={{ color: currentStyle.textPrimary }}> 分钟</span>
                </span>
              ) : (
                <span className="text-3xl md:text-5xl font-bold tracking-tight" style={{ color: currentStyle.textPrimary }}>
                  {focusDuration} <span className="text-base md:text-2xl font-normal">分钟</span>
                </span>
              )}
            </div>

            {/* 右侧：连胜天数 */}
            <div className="text-right">
              <div className="text-[10px] md:text-sm tracking-wider font-medium uppercase mb-1 md:mb-2" style={{ color: currentStyle.textSecondary }}>
                连续专注
              </div>
              {theme === 'mint' ? (
                <span className="text-3xl md:text-5xl font-bold tracking-tight" style={{ color: '#0d9488' }}>
                  {streakDays || 1}
                  <span className="text-base md:text-2xl font-normal" style={{ color: currentStyle.textPrimary }}> 天</span>
                </span>
              ) : (
                <span className="text-3xl md:text-5xl font-bold tracking-tight" style={{ color: currentStyle.textPrimary }}>
                  {streakDays || 1} <span className="text-base md:text-2xl font-normal">天</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 中部：小结心语 */}
        <div className="flex-1 flex flex-col justify-center relative z-10 px-2">
          {summary && (
            <div className="relative">
              {/* 左上角引号 */}
              <div className="absolute -top-2 -left-1 md:-top-4 md:-left-2 text-4xl md:text-6xl font-serif leading-none" style={{ color: currentStyle.quote }}>
                "
              </div>
              
              <div className="text-base md:text-2xl leading-loose md:leading-relaxed font-medium text-center italic px-4 md:px-8 py-2 md:py-4 whitespace-pre-line" style={{ color: currentStyle.textPrimary }}>
                {summary}
              </div>

              {/* 右下角引号 */}
              <div className="absolute -bottom-4 -right-1 md:-bottom-6 md:-right-2 text-4xl md:text-6xl font-serif leading-none transform rotate-180" style={{ color: currentStyle.quote }}>
                "
              </div>
            </div>
          )}
        </div>

        {/* 署名位置 */}
        <div className="relative z-10 pb-4 md:pb-6 flex justify-end items-center gap-3 px-6 md:px-10">
          <div className="text-[10px] md:text-sm font-medium" style={{ color: currentStyle.textSecondary }}>
            — {userName}
          </div>
          {/* Avatar Circle */}
          <div 
            className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden shadow-sm flex items-center justify-center"
            style={{
                border: theme === 'mint' ? '1px solid #99f6e4' : '1px solid rgba(255,255,255,0.5)',
                backgroundColor: theme === 'mint' ? 'rgba(255,255,255,0.5)' : '#f3f4f6'
            }}
          >
              {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                  <span className="text-xs font-bold" style={{ color: theme === 'mint' ? '#0d9488' : '#9ca3af' }}>
                    {userName?.[0]?.toUpperCase() || 'U'}
                  </span>
              )}
          </div>
        </div>

        {/* 底部：Tagline */}
        <div className="relative z-10 pt-4 md:pt-6 mt-2 border-t" style={{ borderColor: currentStyle.divider }}>
          <div className="flex items-center justify-between">
            <div className="text-xs md:text-base tracking-wider" style={{ color: currentStyle.textSecondary }}>
              算法之外，重遇自我
            </div>
            {/* Echo Logo 在右下角 */}
            <div className="flex items-center gap-1.5 md:gap-2 opacity-80">
               <div className="w-5 h-5 md:w-7 md:h-7">
                  <img src="/Echo Icon.png" alt="Lumi" className="w-full h-full object-contain" />
               </div>
               <span className="text-xs md:text-base font-bold tracking-widest uppercase" style={{ color: currentStyle.textSecondary }}>
                 Echo
               </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
