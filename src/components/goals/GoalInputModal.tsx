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
  const enableAssist = process.env.NEXT_PUBLIC_ENABLE_MICRO_GOAL_ASSIST !== 'false';
  const enableManage = process.env.NEXT_PUBLIC_ENABLE_MICRO_GOAL_MANAGE !== 'false';

  const [value, setValue] = useState('');
  const [recentGoals, setRecentGoals] = useState<string[]>([]);
  const [frequentHistory, setFrequentHistory] = useState<Array<{ id: string; text: string; usageCount: number }>>([]);
  const [recentHistory, setRecentHistory] = useState<Array<{ id: string; text: string; usageCount: number }>>([]);
  const [inspirations, setInspirations] = useState<string[]>([]);
  const [isAssistExpanded, setIsAssistExpanded] = useState(false);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isLoadingAssist, setIsLoadingAssist] = useState(false);
  const [isSavingManage, setIsSavingManage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultInspirationTexts = ['读 2 页', '写 5 行', '拉伸 3 分钟', '整理 10 行', '完成 1 次小尝试'];

  const loadAssistData = async () => {
    setRecentGoals(getRecentGoalHistory(userId));

    if (!enableAssist || !userId) return;
    setIsLoadingAssist(true);
    try {
      const response = await fetch('/api/micro-goals/history');
      if (!response.ok) {
        setInspirations(defaultInspirationTexts);
        return;
      }
      const data = await response.json();
      setFrequentHistory(Array.isArray(data?.frequent) ? data.frequent : []);
      setRecentHistory(Array.isArray(data?.recent) ? data.recent : []);
      setInspirations(Array.isArray(data?.inspirations) ? data.inspirations : []);
    } catch (error) {
      console.warn('[GoalInputModal] 加载小目标历史失败，使用本地回填：', error);
      setInspirations(defaultInspirationTexts);
    } finally {
      setIsLoadingAssist(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setValue('');
    setIsAssistExpanded(false);
    setShowManagePanel(false);
    setEditingId(null);
    setEditingText('');
    void loadAssistData();
  }, [visible, userId]);

  const canSubmit = useMemo(() => value.trim().length > 0 && !isSubmitting, [value, isSubmitting]);

  const handleConfirm = async () => {
    const goalTitle = value.trim();
    if (!goalTitle || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm(goalTitle);
      rememberGoalTitle(userId, goalTitle);
      await loadAssistData();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  const uniqueTextList = (items: string[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const normalized = String(item || '').trim();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  };

  const frequentTexts = uniqueTextList(frequentHistory.map((item) => item.text)).slice(0, 8);
  const recentTexts = uniqueTextList(
    recentHistory.map((item) => item.text).concat(recentGoals)
  ).slice(0, 8);
  const inspirationTexts = uniqueTextList(inspirations).slice(0, 5);
  const manageItems = [
    ...recentHistory,
    ...frequentHistory.filter((item) => !recentHistory.some((recent) => recent.id === item.id)),
  ];

  const renameHistoryItem = async () => {
    if (!editingId || !editingText.trim() || isSavingManage) return;
    setIsSavingManage(true);
    try {
      const response = await fetch('/api/micro-goals/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: editingId,
          text: editingText.trim(),
        }),
      });
      if (response.ok) {
        setEditingId(null);
        setEditingText('');
        await loadAssistData();
      }
    } finally {
      setIsSavingManage(false);
    }
  };

  const deleteHistoryItem = async (itemId: string) => {
    if (isSavingManage) return;
    setIsSavingManage(true);
    try {
      const response = await fetch(`/api/micro-goals/history?itemId=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadAssistData();
      }
    } finally {
      setIsSavingManage(false);
    }
  };

  const clearHistory = async () => {
    if (isSavingManage) return;
    setIsSavingManage(true);
    try {
      const response = await fetch('/api/micro-goals/history/clear', {
        method: 'POST',
      });
      if (response.ok) {
        await loadAssistData();
      }
    } finally {
      setIsSavingManage(false);
    }
  };

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
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
            <p className="text-xs text-zinc-500 mt-1">
              为自己设定一个简单可实现的小目标吧！
            </p>
            <p className="text-xs text-zinc-500">
              小公式：一件事情+最小尺度（5分钟，10次，一组）
            </p>
          </div>
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
            placeholder={`${placeholder || '例如：读 2 页 / 写 5 行 / 拉伸 3 分钟'}（最多${maxLength}字）`}
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

          {(enableAssist || recentGoals.length > 0) && (
            <div>
              <button
                type="button"
                onClick={() => setIsAssistExpanded((prev) => !prev)}
                className="w-full rounded-full px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-sm font-medium shadow-md shadow-teal-400/30 transition-all"
              >
                {isAssistExpanded ? '收起复用建议' : '复用一下（可选）'}
              </button>

              {isAssistExpanded && (
              <div className="mt-3">
                <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
                  {frequentTexts.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">常用</p>
                      <div className="flex flex-wrap gap-2">
                        {frequentTexts.map((goal) => (
                          <button
                            key={`frequent-${goal}`}
                            type="button"
                            onClick={() => setValue(goal)}
                            className="px-3 py-1.5 rounded-full bg-white hover:bg-zinc-100 text-xs text-zinc-700 border border-zinc-200 transition"
                          >
                            {goal}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {recentTexts.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">最近</p>
                      <div className="flex flex-wrap gap-2">
                        {recentTexts.map((goal) => (
                          <button
                            key={`recent-${goal}`}
                            type="button"
                            onClick={() => setValue(goal)}
                            className="px-3 py-1.5 rounded-full bg-white hover:bg-zinc-100 text-xs text-zinc-700 border border-zinc-200 transition"
                          >
                            {goal}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-2">
                      <p className="text-xs text-zinc-500">来点灵感？</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {inspirationTexts.map((goal) => (
                        <button
                          key={`idea-${goal}`}
                          type="button"
                          onClick={() => setValue(goal)}
                          className="px-3 py-1.5 rounded-full bg-teal-50 hover:bg-teal-100 text-xs text-teal-800 border border-teal-200 transition"
                        >
                          {goal}
                        </button>
                      ))}
                      {inspirationTexts.length === 0 && !isLoadingAssist && (
                        <span className="text-xs text-zinc-400">先输入一次小目标，后续会越来越懂你。</span>
                      )}
                    </div>
                  </div>

                  {enableAssist && enableManage && userId && manageItems.length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowManagePanel((prev) => !prev)}
                        className="text-xs text-zinc-600 hover:text-zinc-800"
                      >
                        {showManagePanel ? '收起管理' : '管理历史'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>
          )}

          {showManagePanel && enableAssist && enableManage && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">历史编辑 / 删除</p>
                <button
                  type="button"
                  onClick={() => void clearHistory()}
                  className="text-xs text-red-500 hover:text-red-600"
                  disabled={isSavingManage}
                >
                  清空
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-2">
                {manageItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    {editingId === item.id ? (
                      <>
                        <input
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => void renameHistoryItem()}
                          className="text-xs text-teal-700 hover:text-teal-800"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingText('');
                          }}
                          className="text-xs text-zinc-500 hover:text-zinc-700"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="flex-1 text-left text-xs text-zinc-700 hover:text-zinc-900"
                          onClick={() => setValue(item.text)}
                        >
                          {item.text}
                          <span className="ml-1 text-zinc-400">x{item.usageCount}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingText(item.text);
                          }}
                          className="text-xs text-zinc-500 hover:text-zinc-700"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteHistoryItem(item.id)}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
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
