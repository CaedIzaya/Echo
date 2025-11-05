import React from 'react';

interface Project {
  id: string;
  name: string;
  icon: string;
  dailyGoalMinutes: number;
  milestones: Milestone[];
  isActive: boolean;
}

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

interface PlanSelectorProps {
  visible: boolean;
  currentPrimary: string | null;
  plans: Project[];
  onSelect: (planId: string) => void;
  onClose: () => void;
}

export default function PlanSelector({
  visible,
  currentPrimary,
  plans,
  onSelect,
  onClose,
}: PlanSelectorProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              切换主要计划
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            选择一个计划作为主要计划
          </p>
        </div>

        {/* 计划列表 */}
        <div className="max-h-96 overflow-y-auto p-4">
          {plans.length > 0 ? (
            <div className="space-y-3">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => onSelect(plan.id)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left hover:shadow-md ${
                    currentPrimary === plan.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 bg-white hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{plan.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {plan.name}
                        </h3>
                        {currentPrimary === plan.id && (
                          <span className="text-xs bg-teal-100 text-teal-600 px-2 py-1 rounded-full">
                            当前主要
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {plan.dailyGoalMinutes}分钟/天
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-500">暂无可用计划</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}












