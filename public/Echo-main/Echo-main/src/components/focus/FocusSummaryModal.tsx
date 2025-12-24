import React, { useState, useEffect } from 'react';

interface FocusSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  focusDuration: number; // in minutes
  completedTasks: string[];
  userName?: string;
  initialSummary?: string; // Add this
}

export default function FocusSummaryModal({
  isOpen,
  onClose,
  focusDuration,
  completedTasks,
  userName = '旅行者',
  initialSummary = ''
}: FocusSummaryModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [summary, setSummary] = useState(initialSummary);
  const [dateStr, setDateStr] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const now = new Date();
    setDateStr(now.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      weekday: 'long'
    }));
  }, []);

  // Update summary if initialSummary changes (e.g. when opening modal for existing data)
  useEffect(() => {
    if (initialSummary) {
      setSummary(initialSummary);
    }
  }, [initialSummary]);

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const lines = text.split('\n');
    
    // Limits
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
          totalFocusMinutes: focusDuration, // Note: this might overwrite total minutes if called from dashboard with partial data, but usually fine for "today" context
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {step === 1 ? (
        // Step 1: Input
        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-6 text-white">
            <h2 className="text-2xl font-bold mb-1">专注小结</h2>
            <p className="text-teal-100 text-sm">记录此刻的成就与感悟</p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Today's Data */}
            <div className="flex gap-4">
              <div className="flex-1 bg-teal-50 rounded-2xl p-4 border border-teal-100">
                <div className="text-teal-600 text-xs font-bold uppercase mb-1">夺回时间</div>
                <div className="text-2xl font-bold text-teal-800">{focusDuration} <span className="text-sm font-normal text-teal-600">分钟</span></div>
              </div>
              <div className="flex-1 bg-cyan-50 rounded-2xl p-4 border border-cyan-100">
                <div className="text-cyan-600 text-xs font-bold uppercase mb-1">今日完成</div>
                <div className="text-2xl font-bold text-cyan-800">{completedTasks.length} <span className="text-sm font-normal text-cyan-600">个目标</span></div>
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
            <button
              onClick={handleNext}
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-200 hover:shadow-teal-300 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? '保存中...' : '生成分享卡片'}
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white text-gray-500 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {initialSummary ? '关闭' : '跳过'}
            </button>
          </div>
        </div>
      ) : (
        // Step 2: Card Preview & Save
        <div className="flex flex-col items-center gap-6 w-full max-w-lg">
          {/* Card Component */}
          <div 
            className="w-full bg-white rounded-[2rem] overflow-hidden shadow-2xl relative"
            style={{ minHeight: '500px' }}
          >
            {/* Background Decor */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-teal-400 to-cyan-500"></div>
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-24 h-24 bg-white rounded-full p-2 shadow-lg z-10">
               {/* Lumi Icon */}
               <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-teal-50">
                 <img src="/Echo Icon.png" alt="Lumi" className="w-full h-full object-cover" onError={(e) => {
                   // Fallback if image fails
                   (e.target as HTMLImageElement).style.display = 'none';
                   (e.target as HTMLImageElement).parentElement!.innerHTML = '🐳';
                   (e.target as HTMLImageElement).parentElement!.className += ' text-3xl flex items-center justify-center';
                 }} />
               </div>
            </div>

            <div className="pt-36 pb-8 px-8 text-center relative z-0">
               <h3 className="text-xl font-bold text-gray-800 mb-1">{userName}</h3>
               <p className="text-teal-600 text-sm font-medium mb-6">专注旅行者</p>

               <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-100">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                     <div className="text-center border-r border-gray-200">
                        <div className="text-gray-400 text-xs uppercase mb-1">专注时长</div>
                        <div className="text-2xl font-bold text-gray-800">{focusDuration}m</div>
                     </div>
                     <div className="text-center">
                        <div className="text-gray-400 text-xs uppercase mb-1">完成目标</div>
                        <div className="text-2xl font-bold text-gray-800">{completedTasks.length}</div>
                     </div>
                  </div>
                  {completedTasks.length > 0 && (
                    <div className="text-left border-t border-gray-200 pt-4 mt-2">
                      <div className="text-gray-400 text-xs uppercase mb-2">成就清单</div>
                      <div className="flex flex-wrap gap-2">
                        {completedTasks.slice(0, 3).map((task, i) => (
                          <span key={i} className="bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-lg text-xs">
                            {task}
                          </span>
                        ))}
                        {completedTasks.length > 3 && (
                          <span className="text-gray-400 text-xs self-center">+{completedTasks.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
               </div>

               {summary && (
                 <div className="relative mb-8">
                   <div className="absolute -top-3 left-4 text-4xl text-teal-100 font-serif">"</div>
                   <p className="text-gray-600 italic leading-relaxed px-4 relative z-10">
                     {summary}
                   </p>
                   <div className="absolute -bottom-6 right-4 text-4xl text-teal-100 font-serif">"</div>
                 </div>
               )}

               <div className="flex items-center justify-between text-gray-400 text-xs mt-8 pt-6 border-t border-gray-100">
                  <span>{dateStr}</span>
                  <span className="font-semibold text-teal-500">Lumi Focus</span>
               </div>
            </div>
          </div>

          <div className="flex justify-center w-full">
            <button
              onClick={onClose}
              className="px-8 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 backdrop-blur-md transition-all border border-white/30 py-4"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

