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
  focusBranch?: string;
  icon: string;
  dailyGoalMinutes: number;
  milestones: Milestone[];
  isActive: boolean;
  isPrimary?: boolean;
  isBlank?: boolean;
}

interface PlanManagementProps {
  selectedPlan: Project | undefined;
  onSetPrimary: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

export default function PlanManagement({
  selectedPlan,
  onSetPrimary,
  onDelete,
  onComplete,
  onCancel,
}: PlanManagementProps) {
  const hasSelection = !!selectedPlan;

  return (
    <div className="fixed bottom-24 left-0 right-0 p-4 z-40 animate-slide-up">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl shadow-teal-200/50 border border-white/60 p-5 max-w-md mx-auto">
        {!hasSelection ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
              <span className="text-2xl">👆</span>
            </div>
            <p className="text-teal-600 font-medium">请先选择一个计划</p>
            <p className="text-teal-500/60 text-xs mt-1">点击上方计划卡片进行选择</p>
            {/* 取消按钮 */}
            <button
              onClick={onCancel}
              className="mt-4 w-full group flex flex-col items-center justify-center gap-2 p-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 font-semibold text-sm"
            >
              <span className="text-3xl text-gray-400 transform group-hover:scale-110 transition-transform">✕</span>
              <span className="text-gray-900">取消管理</span>
            </button>
          </div>
        ) : (
          <>
            {/* 选中的计划预览 */}
            <div className="mb-5 p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl border border-emerald-100/60 flex items-center gap-4 shadow-sm">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-3xl shadow-lg shadow-teal-300/50">
                {selectedPlan.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-teal-900 truncate text-lg">
                  {selectedPlan.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-teal-600/70 font-medium">
                    {selectedPlan.dailyGoalMinutes}分钟/天
                  </p>
                  {selectedPlan.isPrimary && (
                    <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded-full font-semibold">
                      ⭐ 主要
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="grid grid-cols-3 gap-3">
              {!selectedPlan.isPrimary && (
                <>
                  <button
                    onClick={onSetPrimary}
                    className="group flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-500 text-white rounded-2xl hover:shadow-xl shadow-lg shadow-amber-300/50 transition-all duration-300 transform hover:scale-105 active:scale-95 font-semibold text-sm relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-300 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="text-3xl relative z-10 transform group-hover:scale-110 transition-transform">⭐</span>
                    <span className="relative z-10">设为主要</span>
                  </button>

                  <button
                    onClick={onComplete}
                    className="group flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-2xl hover:shadow-xl shadow-lg shadow-emerald-300/50 transition-all duration-300 transform hover:scale-105 active:scale-95 font-semibold text-sm relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="text-3xl relative z-10 transform group-hover:scale-110 transition-transform">🎉</span>
                    <span className="relative z-10">完成</span>
                  </button>

                  <button
                    onClick={onDelete}
                    className="group flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 text-white rounded-2xl hover:shadow-xl shadow-lg shadow-red-300/50 transition-all duration-300 transform hover:scale-105 active:scale-95 font-semibold text-sm relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="text-3xl relative z-10 transform group-hover:scale-110 transition-transform">🗑️</span>
                    <span className="relative z-10">删除</span>
                  </button>
                </>
              )}

              {selectedPlan.isPrimary && (
                <>
                  <button
                    onClick={onComplete}
                    className="group flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-2xl hover:shadow-xl shadow-lg shadow-emerald-300/50 transition-all duration-300 transform hover:scale-105 active:scale-95 font-semibold text-sm relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="text-3xl relative z-10 transform group-hover:scale-110 transition-transform">🎉</span>
                    <span className="relative z-10">完成计划</span>
                  </button>

                  <button
                    onClick={onDelete}
                    className="group flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 text-white rounded-2xl hover:shadow-xl shadow-lg shadow-red-300/50 transition-all duration-300 transform hover:scale-105 active:scale-95 font-semibold text-sm relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="text-3xl relative z-10 transform group-hover:scale-110 transition-transform">🗑️</span>
                    <span className="relative z-10">删除</span>
                  </button>

                  <button
                    onClick={onCancel}
                    className="group flex flex-col items-center justify-center gap-2 p-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 font-semibold text-sm"
                  >
                    <span className="text-3xl text-gray-400 transform group-hover:scale-110 transition-transform">✕</span>
                    <span className="text-gray-900">取消</span>
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


