import React from 'react';

interface InterruptedSessionAlertProps {
  minutes: number;
  timestamp: string;
  onConfirm: () => void;
}

export default function InterruptedSessionAlert({ 
  minutes, 
  timestamp, 
  onConfirm 
}: InterruptedSessionAlertProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-slide-in">
        {/* 图标 */}
        <div className="text-center mb-4">
          <div className="text-6xl mb-2">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900">专注意外结束</h2>
        </div>

        {/* 内容 */}
        <div className="space-y-3 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm text-gray-600 mb-2">你上次专注了</p>
            <p className="text-3xl font-bold text-blue-600 mb-2">{minutes} 分钟</p>
            <p className="text-xs text-gray-500">
              {new Date(timestamp).toLocaleString('zh-CN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          <div className="bg-green-50 rounded-xl p-3 border border-green-100">
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <span className="text-green-600">✓</span>
              我们已为你记录到了个人仪表盘
            </p>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <p className="text-sm text-amber-700">
              💡 提示：专注计时器将在准备状态下等待你的归来
            </p>
          </div>
        </div>

        {/* 按钮 */}
        <button
          onClick={onConfirm}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          知道了
        </button>
      </div>
    </div>
  );
}























