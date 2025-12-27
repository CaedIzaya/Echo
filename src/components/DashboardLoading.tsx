import React from 'react';

interface DashboardLoadingProps {
  progress?: {
    total: number;
    loaded: number;
    currentTask: string;
  };
  message?: string;
}

/**
 * Dashboard 数据加载界面
 * 使用漂亮的过渡动画，避免用户觉得无聊
 */
export default function DashboardLoading({ progress, message }: DashboardLoadingProps) {
  const loadingMessage = message || progress?.currentTask || '准备你的专注空间...';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-500 text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_60%)]" />
      <div className="relative z-10 flex flex-col items-center gap-10 px-6 text-center">
        <p className="text-xs tracking-[0.4em] uppercase text-white/70">Echo Focus</p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">专注准备中...</h1>
        <div className="flex items-end justify-center gap-3 h-10">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="w-4 h-4 rounded-full bg-white/90 animate-dot-bounce"
              style={{ animationDelay: `${dot * 0.2}s` }}
            />
          ))}
        </div>
        <p className="text-sm tracking-[0.3em] uppercase text-white/70">
          {loadingMessage}
        </p>
      </div>

      <style jsx>{`
        @keyframes dot-bounce {
          0%,
          60%,
          100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }
        .animate-dot-bounce {
          animation: dot-bounce 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}


