import React, { useEffect, useMemo, useState } from 'react';
import { getRecentGoalHistory, rememberGoalTitle } from '~/lib/goalHistory';

interface GoalInputModalProps {
  visible: boolean;
  userId?: string;
  title?: string;
  placeholder?: string;
  maxLength?: number;
  onClose: () => void;
  onConfirm: (goalTitle: string) => Promise<void> | void;
}

export default function GoalInputModal({
  visible,
  userId,
  title = '添加小目标',
  placeholder = '输入小目标内容',
  maxLength = 20,
  onClose,
  onConfirm,
}: GoalInputModalProps) {
  const [value, setValue] = useState('');
  const [recentGoals, setRecentGoals] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setValue('');
    setRecentGoals(getRecentGoalHistory(userId));
  }, [visible, userId]);

  const canSubmit = useMemo(() => value.trim().length > 0 && !isSubmitting, [value, isSubmitting]);

  const handleConfirm = async () => {
    const goalTitle = value.trim();
    if (!goalTitle || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm(goalTitle);
      rememberGoalTitle(userId, goalTitle);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-white/60 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={maxLength}
            rows={3}
            autoFocus
            placeholder={`${placeholder}（最多${maxLength}字）`}
            className="w-full resize-none rounded-2xl border border-zinc-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-200 outline-none px-4 py-3 text-sm text-zinc-800"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />
          <div className="text-right text-xs text-zinc-400">
            {value.length}/{maxLength}
          </div>

          {recentGoals.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2">最近使用（点击可回填）</p>
              <div className="flex flex-wrap gap-2">
                {recentGoals.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setValue(goal)}
                    className="px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-xs text-zinc-700 transition"
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium transition"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition"
          >
            {isSubmitting ? '保存中...' : '确认添加'}
          </button>
        </div>
      </div>
    </div>
  );
}
