import React, { useState } from 'react';

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
  isCompleted?: boolean;
}

interface PlanCardProps {
  plan: Project;
  isPrimary?: boolean;
  selectable?: boolean;
  selected?: boolean;
  isCompleted?: boolean;
  onSelect?: (planId: string) => void;
  onAddMilestone?: (planId: string) => void;
}

export default function PlanCard({
  plan,
  isPrimary = false,
  selectable = false,
  selected = false,
  isCompleted = false,
  onSelect,
  onAddMilestone,
}: PlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Guard against undefined plan or milestones during static generation/SSR
  if (!plan || !plan.milestones) {
    return null;
  }
  
  const completedMilestones = plan.milestones.filter(m => m.isCompleted).length;
  const totalMilestones = plan.milestones.length;
  const activeMilestones = plan.milestones.filter(m => !m.isCompleted);

  // 检查是否可以添加小目标（基于活跃小目标数量，限制为10个）
  const canAddMilestone = activeMilestones.length < 10;

  const handleCardClick = () => {
    if (selectable && onSelect) {
      onSelect(plan.id);
    }
  };

  if (isCompleted) {
    return (
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200 opacity-60">
        <div className="flex items-center gap-4">
          <div className="text-4xl">{plan.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-700">{plan.name}</h3>
              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                已完成
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {plan.dailyGoalMinutes}分钟/天 • {completedMilestones}/{totalMilestones}个小目标
            </p>
          </div>
        </div>
      </div>
    );
  }

  const cardClassNames = [
    'bg-white/70 backdrop-blur-md rounded-[24px] p-6 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.25)] transition-all cursor-pointer transform border border-slate-200/80 hover:-translate-y-1 hover:shadow-[0_22px_55px_-30px_rgba(15,23,42,0.3)]',
  ];

  if (selected) {
    cardClassNames.push('ring-4 ring-teal-500 ring-opacity-50 border-teal-500');
  } else {
    cardClassNames.push('hover:border-teal-200/80');
  }

  if (isPrimary) {
    cardClassNames.push('scale-[1.02] md:scale-[1.04] border-teal-500 ring-4 ring-teal-200 ring-opacity-40 outline outline-1 outline-white/70 animate-pulse-border');
  }

  return (
    <div
      onClick={handleCardClick}
      className={cardClassNames.join(' ')}
    >
      {/* 主要计划标识 */}
      {isPrimary && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-teal-100 text-teal-600 px-3 py-1 rounded-full font-medium">
            🌟 主要计划
          </span>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* 左侧内容 */}
        <div className="flex items-start gap-4 flex-1">
          {/* 图标 */}
          <div className="text-5xl flex-shrink-0">{plan.icon}</div>

          {/* 计划信息 */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
            
            {/* 每日目标 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-500">每日目标</span>
              <span className="text-sm font-semibold text-teal-600">
                {plan.dailyGoalMinutes}分钟
              </span>
            </div>

            {/* 小目标预览 - 只显示未完成的目标 */}
            <div className="space-y-2">
              {(() => {
                // 只获取未完成的小目标
                const activeMilestones = plan.milestones.filter(m => !m.isCompleted);
                
                return activeMilestones.length > 0 ? (
                  <>
                    {/* 显示的小目标数量：展开时显示全部，折叠时只显示前3个 */}
                    {(isExpanded ? activeMilestones : activeMilestones.slice(0, 3)).map(milestone => (
                      <div
                        key={milestone.id}
                        className="text-sm text-gray-700 flex items-start gap-2"
                      >
                        <span className="text-teal-500 mt-1">•</span>
                        <span>{milestone.title}</span>
                      </div>
                    ))}
                    {/* 如果有超过3个小目标，显示展开/折叠按钮 */}
                    {activeMilestones.length > 3 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsExpanded(!isExpanded);
                        }}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors cursor-pointer"
                      >
                        {isExpanded 
                          ? '收起' 
                          : `+${activeMilestones.length - 3}个更多小目标`}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400">
                    {plan.milestones.length > 0 ? '所有小目标已完成' : '暂无小目标'}
                  </p>
                );
              })()}

              {/* 快速添加小目标 */}
              {canAddMilestone && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddMilestone?.(plan.id);
                  }}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 mt-2"
                >
                  ➕ 添加小目标
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

