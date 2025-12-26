import React, { useState, useEffect } from 'react';

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

interface ManageMilestonesModalProps {
  visible: boolean;
  planId: string;
  planName: string;
  milestones: Milestone[];
  onClose: () => void;
  onSave: (milestones: Milestone[], priorityIds: string[]) => void;
  onDelete: (milestoneId: string) => void;
  onAdd: (title: string, planId?: string) => void;
}

export default function ManageMilestonesModal({
  visible,
  planId,
  planName,
  milestones,
  onClose,
  onSave,
  onDelete,
  onAdd,
}: ManageMilestonesModalProps) {
  const [localMilestones, setLocalMilestones] = useState<Milestone[]>(milestones);
  const [priorityIds, setPriorityIds] = useState<string[]>([]);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  // 初始化优先级（从 localStorage 读取）
  useEffect(() => {
    if (visible && milestones.length > 0) {
      const savedPriority = localStorage.getItem(`plan_${planId}_priority_milestones`);
      if (savedPriority) {
        try {
          const savedIds = JSON.parse(savedPriority);
          // 验证这些ID是否仍然存在于当前里程碑中
          const validIds = savedIds.filter((id: string) => 
            milestones.some(m => m.id === id && !m.isCompleted)
          );
          setPriorityIds(validIds.slice(0, 3)); // 最多3个
        } catch (e) {
          console.error('读取优先级失败:', e);
        }
      }
    }
  }, [visible, planId, milestones]);

  // 当里程碑变化时更新本地状态
  useEffect(() => {
    setLocalMilestones(milestones);
  }, [milestones]);

  const activeMilestones = localMilestones.filter(m => !m.isCompleted);

  // 切换优先级
  const togglePriority = (milestoneId: string) => {
    setPriorityIds(prev => {
      if (prev.includes(milestoneId)) {
        return prev.filter(id => id !== milestoneId);
      } else if (prev.length < 3) {
        return [...prev, milestoneId];
      } else {
        // 如果已经有3个，替换第一个
        return [milestoneId, ...prev.slice(0, 2)];
      }
    });
  };

  // 处理添加小目标
  const handleAdd = () => {
    if (newMilestoneTitle.trim()) {
      onAdd(newMilestoneTitle.trim(), planId);
      setNewMilestoneTitle('');
      setShowAddInput(false);
    }
  };

  // 处理保存
  const handleSave = () => {
    // 保存优先级到 localStorage
    localStorage.setItem(`plan_${planId}_priority_milestones`, JSON.stringify(priorityIds));
    
    // 更新里程碑顺序（优先级在前）
    const priorityMilestones = priorityIds
      .map(id => localMilestones.find(m => m.id === id))
      .filter(Boolean) as Milestone[];
    
    const otherMilestones = localMilestones.filter(
      m => !priorityIds.includes(m.id)
    );

    const reorderedMilestones = [
      ...priorityMilestones,
      ...otherMilestones
    ].map((m, index) => ({
      ...m,
      order: index + 1
    }));

    onSave(reorderedMilestones, priorityIds);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-scale-in">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-gray-900">管理小目标</h3>
            <p className="text-sm text-gray-500 mt-1">{planName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. 设置主界面优先级三个小目标 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>⭐</span>
              <span>设置主界面优先级（最多3个）</span>
            </h4>
            <div className="space-y-2">
              {activeMilestones.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">暂无未完成的小目标</p>
              ) : (
                activeMilestones.map(milestone => {
                  const isPriority = priorityIds.includes(milestone.id);
                  return (
                    <label
                      key={milestone.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        isPriority
                          ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-400'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isPriority}
                        onChange={() => togglePriority(milestone.id)}
                        disabled={!isPriority && priorityIds.length >= 3}
                        className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500 disabled:opacity-50"
                      />
                      <span className={`text-sm font-medium flex-1 ${
                        isPriority ? 'text-amber-900' : 'text-gray-700'
                      }`}>
                        {milestone.title}
                      </span>
                      {isPriority && (
                        <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full">
                          优先级 {priorityIds.indexOf(milestone.id) + 1}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
            {priorityIds.length >= 3 && (
              <p className="text-xs text-amber-600 mt-2">⚠️ 最多只能设置3个优先级小目标</p>
            )}
          </div>

          {/* 2. 删除小目标 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>🗑️</span>
              <span>删除小目标</span>
            </h4>
            <div className="space-y-2">
              {activeMilestones.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">暂无未完成的小目标</p>
              ) : (
                activeMilestones.map(milestone => (
                  <div
                    key={milestone.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-red-50 transition-all"
                  >
                    <span className="text-sm text-gray-700">{milestone.title}</span>
                    <button
                      onClick={() => {
                        if (confirm(`确定要删除"${milestone.title}"吗？`)) {
                          onDelete(milestone.id);
                          // 如果删除的是优先级小目标，从优先级列表中移除
                          if (priorityIds.includes(milestone.id)) {
                            setPriorityIds(prev => prev.filter(id => id !== milestone.id));
                          }
                        }
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. 添加小目标 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>➕</span>
              <span>添加小目标</span>
            </h4>
            {!showAddInput ? (
              <button
                onClick={() => setShowAddInput(true)}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/60 text-teal-600 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium">添加新小目标</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="输入小目标..."
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 border-emerald-200/60 bg-white focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300/50 transition-all"
                  autoFocus
                  maxLength={20}
                />
                <button
                  onClick={handleAdd}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:shadow-lg transition-all font-medium"
                >
                  添加
                </button>
                <button
                  onClick={() => {
                    setShowAddInput(false);
                    setNewMilestoneTitle('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all font-medium"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 font-medium transition"
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

