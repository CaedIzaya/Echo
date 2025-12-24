import React, { useState } from 'react';

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

interface FinalGoal {
  content: string;
  createdAt: string;
  isCompleted: boolean;
  completedAt?: string;
}

interface Project {
  id: string;
  name: string;
  focusBranch?: string; // 计划分支
  icon: string;
  dailyGoalMinutes: number;
  milestones: Milestone[];
  finalGoal?: FinalGoal; // 计划的里程碑（终极目标）
  isActive: boolean;
  isPrimary?: boolean;
  isCompleted?: boolean;
  isBlank?: boolean; // 是否为空白计划
}

interface PlanCardProps {
  plan: Project;
  isPrimary?: boolean;
  selectable?: boolean;
  selected?: boolean;
  isCompleted?: boolean;
  onSelect?: (planId: string) => void;
  onAddMilestone?: (planId: string) => void;
  onEdit?: (planId: string) => void; // 编辑回调
  onManageMilestone?: (planId: string) => void; // 管理里程碑回调
  onDeleteCompleted?: (planId: string) => void; // 删除已完成计划回调
}

export default function PlanCard({
  plan,
  isPrimary = false,
  selectable = false,
  selected = false,
  isCompleted = false,
  onSelect,
  onAddMilestone,
  onEdit,
  onManageMilestone,
  onDeleteCompleted,
}: PlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Guard against undefined plan
  if (!plan) {
    return null;
  }
  
  // 确保milestones是数组
  const milestones = plan.milestones || [];
  const completedMilestones = milestones.filter(m => m.isCompleted).length;
  const totalMilestones = milestones.length;
  const activeMilestones = milestones.filter(m => !m.isCompleted);

  // 检查是否可以添加小目标（基于活跃小目标数量，限制为10个）
  const canAddMilestone = activeMilestones.length < 10;

  const handleCardClick = () => {
    if (selectable && onSelect) {
      onSelect(plan.id);
    }
  };

  if (isCompleted) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-emerald-200 hover:shadow-lg transition-all">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-3xl shadow-sm">
            {plan.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-800 truncate">
                {plan.name || plan.focusBranch}
              </h3>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                ✓ 已完成
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {completedMilestones}/{totalMilestones}个小目标完成
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // 跳转到回顾页面
                if (typeof window !== 'undefined') {
                  window.location.href = `/plans/${plan.id}/review`;
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              查看回顾
            </button>
            {onDeleteCompleted && (
              <button
                onClick={() => {
                  if (confirm(`确定要删除已完成的计划"${plan.name}"吗？\n\n此操作不可恢复，但不会影响您的统计数据。`)) {
                    onDeleteCompleted(plan.id);
                  }
                }}
                className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-xl transition-all hover:scale-105 active:scale-95"
                title="删除已完成计划"
              >
                🗑️
              </button>
            )}
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-900">
                {plan.name || plan.focusBranch}
              </h3>
              {/* 编辑按钮 - 位置与计划名称平行 */}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(plan.id);
                  }}
                  className="text-gray-400 hover:text-teal-600 transition-colors p-1 rounded-lg hover:bg-teal-50"
                  title="编辑计划"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
            
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
                const activeMilestones = milestones.filter(m => !m.isCompleted);
                
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
                    {plan.isBlank 
                      ? '空白计划，点击编辑开始设置' 
                      : milestones.length > 0 
                        ? '所有小目标已完成' 
                        : '暂无小目标'}
                  </p>
                );
              })()}

              {/* 快速添加小目标 & 管理里程碑 */}
              {!plan.isBlank && (
                <div className="flex flex-wrap gap-4 mt-2">
                  {canAddMilestone && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddMilestone?.(plan.id);
                      }}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                    >
                      ➕ 添加小目标
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageMilestone?.(plan.id);
                    }}
                    className={`text-sm font-medium flex items-center gap-1 ${
                      plan.finalGoal 
                        ? plan.finalGoal.isCompleted 
                          ? 'text-green-600' // 已完成
                          : 'text-amber-600 hover:text-amber-700' // 进行中
                        : 'text-gray-400 hover:text-gray-500' // 未设置
                    }`}
                  >
                    {plan.finalGoal 
                      ? plan.finalGoal.isCompleted 
                        ? '👑 里程碑已达成'
                        : '🏆 管理里程碑'
                      : '🏁 设置里程碑'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

