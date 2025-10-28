import React, { useState } from 'react';

interface AddMilestoneModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
}

export default function AddMilestoneModal({ visible, onClose, onSave }: AddMilestoneModalProps) {
  const [title, setTitle] = useState('');
  const maxLength = 20;

  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim());
      setTitle('');
    }
  };

  const handleCancel = () => {
    setTitle('');
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">添加小目标</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 输入框 */}
        <div className="mb-4">
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={maxLength}
            placeholder="输入小目标内容（最多20字）"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
            }}
          />
          <div className="text-right text-sm text-gray-400 mt-1">
            {title.length}/{maxLength}
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 px-4 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}



