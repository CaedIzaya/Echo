import React from 'react';

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

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

interface CompletionDialogProps {
  visible: boolean;
  plan: Project | null;
  onReview: () => void;
  onSkip: () => void;
}

export default function CompletionDialog({
  visible,
  plan,
  onReview,
  onSkip,
}: CompletionDialogProps) {
  if (!visible || !plan || !plan.milestones) return null;

  const completedMilestones = plan.milestones.filter(m => m.isCompleted).length;
  const totalMilestones = plan.milestones.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
        {/* 庆祝内容 */}
        <div className="p-8 text-center">
          {/* 庆祝动画 */}
          <div className="text-6xl mb-4 animate-bounce">
            🎉
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            恭喜完成！
          </h2>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-3xl">{plan.icon}</span>
            <h3 className="text-xl font-semibold text-gray-900">
              {plan.name}
            </h3>
          </div>

          <p className="text-gray-600 mb-6">
            您已经完成了这个计划的所有目标
          </p>

          {/* 统计信息 */}
          <div className="bg-teal-50 rounded-2xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-600">
                  {completedMilestones}/{totalMilestones}
                </div>
                <div className="text-sm text-gray-600">完成小目标</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-600">
                  {plan.dailyGoalMinutes}
                </div>
                <div className="text-sm text-gray-600">每日目标</div>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              onClick={onReview}
              className="w-full bg-teal-500 text-white py-3 rounded-xl font-medium hover:bg-teal-600 transition shadow-lg"
            >
              📖 回顾这段旅程
            </button>
            <button
              onClick={onSkip}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              继续
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}











