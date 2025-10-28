'use client';

import { useState } from 'react';

interface FocusSummaryProps {
  duration: number;
  plannedMinutes: number;
  onSave: (rating: number, note: string) => void;
  onSkip: () => void;
}

export default function FocusSummary({
  duration,
  plannedMinutes,
  onSave,
  onSkip
}: FocusSummaryProps) {
  const [rating, setRating] = useState(3);
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const targetSeconds = plannedMinutes * 60;
  const isCompleted = duration >= targetSeconds;
  const progress = Math.min(duration / targetSeconds, 1);

  const handleSubmit = () => {
    onSave(rating, note);
    setShowSuccess(true);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full bg-white/10 backdrop-blur-lg rounded-3xl p-8">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-3xl font-bold text-white mb-4">
            完成小结！
          </h2>
          <p className="text-white/90 text-lg mb-8">
            您夺回的时间已被世界记住。
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('focusSession');
                  window.location.href = '/dashboard';
                }
              }}
              className="w-full rounded-xl bg-white px-4 py-4 text-teal-600 font-semibold text-lg hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              返回主页
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('focusSession');
                  window.location.href = '/focus';
                }
              }}
              className="w-full rounded-xl bg-white/20 px-4 py-4 text-white font-semibold text-lg hover:bg-white/30 transition-all backdrop-blur-sm"
            >
              继续专注
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          专注小结
        </h2>

        {/* 本次专注时长 */}
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-teal-600 mb-2">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <p className="text-gray-600">本次专注时长</p>
        </div>

        {/* 与目标对比 */}
        <div className="bg-teal-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">目标时长</span>
            <span className="text-sm font-semibold text-gray-900">{plannedMinutes} 分钟</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className={`h-3 rounded-full transition-all ${
                isCompleted ? 'bg-yellow-500' : 'bg-teal-500'
              }`}
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-center text-gray-500">
            {isCompleted 
              ? `超额完成 ${Math.floor((duration - targetSeconds) / 60)} 分钟`
              : `完成度 ${Math.floor(progress * 100)}%`}
          </p>
        </div>

        {/* 鼓励文案 */}
        <div className="mb-6 text-center">
          <p className="text-gray-700 text-lg font-medium">
            {isCompleted
              ? '🎉 超额完成！你的专注力超乎想象'
              : progress >= 0.8
              ? '✨ 接近目标了，你已经做得很棒'
              : duration > targetSeconds / 2
              ? '💪 超过一半了，继续加油'
              : '🌱 好的开始是成功的一半'}
          </p>
        </div>

        {/* 评分 */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3 text-center">
            本次专注质量
          </p>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`w-16 h-16 rounded-full transition-all transform hover:scale-110 ${
                  star <= rating
                    ? 'bg-yellow-400 text-yellow-800'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* 文本输入 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            记录感受（可选，100字以内）
          </label>
          <textarea
            value={note}
            onChange={(e) => {
              if (e.target.value.length <= 100) {
                setNote(e.target.value);
              }
            }}
            placeholder="写下这段专注的感受..."
            rows={4}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 resize-none"
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {note.length}/100
          </div>
        </div>

        {/* 按钮 */}
        <div className="space-y-3">
          <button
            onClick={handleSubmit}
            className="w-full rounded-xl bg-teal-500 px-4 py-4 text-white font-semibold text-lg hover:bg-teal-600 transition-all duration-200 shadow-lg shadow-teal-200 hover:shadow-xl transform hover:scale-[1.02]"
          >
            完成总结
          </button>
          <button
            onClick={onSkip}
            className="w-full rounded-xl bg-gray-100 px-4 py-4 text-gray-700 font-semibold text-lg hover:bg-gray-200 transition-all"
          >
            下次一定
          </button>
        </div>
      </div>
    </div>
  );
}

