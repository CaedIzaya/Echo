'use client';

import { useState } from 'react';

interface FocusSummaryModalProps {
  isOpen: boolean;
  duration: number;
  onClose: () => void;
  onSave: (summary: string, rating: number) => void;
  onSkip: () => void;
}

export default function FocusSummaryModal({
  isOpen,
  duration,
  onClose,
  onSave,
  onSkip
}: FocusSummaryModalProps) {
  const [summary, setSummary] = useState('');
  const [rating, setRating] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const minutes = Math.floor(duration / 60);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onSave(summary, rating);
      onClose();
    } catch (error) {
      console.error('保存专注小结失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-scale-in">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          专注小结
        </h2>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">
            本次你专注了 <span className="font-semibold text-teal-600">{minutes} 分钟</span>
          </p>
          <p className="text-sm text-gray-500">
            有什么想法或感受吗？（选填，100字以内）
          </p>
          <textarea
            value={summary}
            onChange={(e) => {
              if (e.target.value.length <= 100) {
                setSummary(e.target.value);
              }
            }}
            placeholder="记录下这段专注的感受..."
            rows={4}
            className="w-full mt-3 rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 resize-none"
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {summary.length}/100
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">自评专注质量</p>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`w-12 h-12 rounded-full transition-all transform hover:scale-110 ${
                  star <= rating
                    ? 'bg-yellow-400 text-yellow-800'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            稍后补录
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-all shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}





