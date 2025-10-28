import React from 'react';

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

interface Project {
  id: string;
  name: string;
  icon: string;
  dailyGoalMinutes: number;
  milestones: Milestone[];
  isActive: boolean;
  isPrimary?: boolean;
}

interface PlanManagementProps {
  selectedPlan: Project | undefined;
  onSetPrimary: () => void;
  onDelete: () => void;
  onComplete: () => void;
}

export default function PlanManagement({
  selectedPlan,
  onSetPrimary,
  onDelete,
  onComplete,
}: PlanManagementProps) {
  const hasSelection = !!selectedPlan;

  return (
    <div className="fixed bottom-24 left-0 right-0 p-4 z-40 animate-slide-up">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-4">
        {!hasSelection ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">请先选择一个计划</p>
          </div>
        ) : (
          <>
            {/* 选中的计划预览 */}
            <div className="mb-4 p-3 bg-teal-50 rounded-2xl flex items-center gap-3">
              <div className="text-3xl">{selectedPlan.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {selectedPlan.name}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedPlan.dailyGoalMinutes}分钟/天
                </p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="grid grid-cols-3 gap-2">
              {!selectedPlan.isPrimary && (
                <button
                  onClick={onSetPrimary}
                  className="flex flex-col items-center gap-2 p-3 bg-teal-500 text-white rounded-2xl hover:bg-teal-600 transition font-medium text-sm"
                >
                  <span className="text-2xl">⭐</span>
                  <span>设为主要</span>
                </button>
              )}

              {selectedPlan.isPrimary && (
                <>
                  <button
                    onClick={onComplete}
                    className="flex flex-col items-center gap-2 p-3 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition font-medium text-sm"
                  >
                    <span className="text-2xl">🎉</span>
                    <span>完成</span>
                  </button>

                  <button
                    onClick={onDelete}
                    className="flex flex-col items-center gap-2 p-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition font-medium text-sm"
                  >
                    <span className="text-2xl">🗑️</span>
                    <span>删除</span>
                  </button>
                </>
              )}

              {!selectedPlan.isPrimary && (
                <>
                  <button
                    onClick={onComplete}
                    className="flex flex-col items-center gap-2 p-3 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition font-medium text-sm"
                  >
                    <span className="text-2xl">🎉</span>
                    <span>完成</span>
                  </button>

                  <button
                    onClick={onDelete}
                    className="flex flex-col items-center gap-2 p-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition font-medium text-sm"
                  >
                    <span className="text-2xl">🗑️</span>
                    <span>删除</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


