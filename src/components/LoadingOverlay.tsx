import React from 'react';

interface LoadingOverlayProps {
  message?: string;
}

/**
 * 半透明加载遮罩组件
 * 用于防止用户在关键操作（注册、提交表单等）时误点
 */
export default function LoadingOverlay({ message = '处理中...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white/95 rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-4 min-w-[200px]">
        {/* 加载动画 */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-teal-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin" />
        </div>
        
        {/* 加载文字 */}
        <p className="text-slate-700 font-medium text-center">{message}</p>
        
        {/* 提示文字 */}
        <p className="text-xs text-slate-400 text-center">请稍候，不要关闭页面</p>
      </div>
    </div>
  );
}



