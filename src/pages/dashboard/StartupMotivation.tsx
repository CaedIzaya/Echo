import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

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
  focusBranch?: string;
  isPrimary?: boolean;
}

interface CustomGoal {
  id: string;
  title: string;
  completed: boolean;
}

interface StartupMotivationProps {
  primaryPlan: Project | null;
  dailyGoalMinutes: number;
  onClose: () => void;
  onConfirmGoal: (milestoneId: string) => void;
  onQuickStart: () => void;
  onAddMilestone?: (title: string) => Promise<void>; // 添加小目标到计划的回调
}

export default function StartupMotivation({
  primaryPlan,
  dailyGoalMinutes,
  onClose,
  onConfirmGoal,
  onQuickStart,
  onAddMilestone,
}: StartupMotivationProps) {
  const router = useRouter();
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [customGoals, setCustomGoals] = useState<CustomGoal[]>([]);

  // 获取未完成的小目标
  const planMilestones = primaryPlan?.milestones.filter(m => !m.isCompleted) || [];
  
  // 合并计划小目标和自定义小目标
  const allGoals = [
    ...planMilestones.map(m => ({ 
      id: m.id, 
      title: m.title, 
      completed: false,
      isPlanGoal: true // 标记为计划小目标
    })),
    ...customGoals.map(g => ({ ...g, isPlanGoal: false })) // 标记为自定义小目标
  ];
  
  // 默认选中第一个小目标
  useEffect(() => {
    if (allGoals.length > 0 && !selectedMilestoneId) {
      setSelectedMilestoneId(allGoals[0].id);
    }
  }, [allGoals.length]); // 只依赖长度，避免循环
  
  // 添加自定义小目标
  const handleAddGoal = async () => {
    if (!newGoalTitle.trim()) return;
    
    const newGoal: CustomGoal = {
      id: `custom-${Date.now()}`,
      title: newGoalTitle.trim(),
      completed: false
    };
    
    // 如果有计划且提供了添加回调，则添加到计划中
    if (primaryPlan && onAddMilestone) {
      try {
        await onAddMilestone(newGoalTitle.trim());
        // 添加成功后，不需要手动更新 customGoals，因为会从计划中重新获取
      } catch (error) {
        console.error('添加小目标到计划失败:', error);
        // 失败时添加为自定义小目标
        setCustomGoals([...customGoals, newGoal]);
      }
    } else {
      // 没有计划或没有回调，添加为自定义小目标
      setCustomGoals([...customGoals, newGoal]);
    }
    
    // 自动选中新添加的小目标
    setSelectedMilestoneId(newGoal.id);
    setNewGoalTitle('');
    setShowAddGoal(false);
  };

  // 处理关闭动画
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // 确认小目标
  const handleConfirmGoal = () => {
    if (selectedMilestoneId) {
      onConfirmGoal(selectedMilestoneId);
      handleClose();
    }
  };

  // 快速启动
  const handleQuickStart = () => {
    onQuickStart();
    handleClose();
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      >
        {/* 弹窗卡片 */}
        <div 
          className={`bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all duration-300 ${
            isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="relative bg-gradient-to-br from-teal-500 to-cyan-600 p-8 pb-12">
            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 标题 */}
            <div className="text-center">
              <div className="text-5xl mb-4 animate-bounce-gentle">🌟</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                要不要为今天选一个开始的理由？
              </h2>
              <p className="text-white/80 text-sm">
                给自己一个专注的方向
              </p>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-6 space-y-6">
            {/* 选项1：确认小目标 */}
            {allGoals.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  📌 今天的小目标
                </h3>
                
                {/* 小目标选择器 - 显示所有小目标（包括自定义的） */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allGoals.map((goal: any) => (
                    <label
                      key={goal.id}
                      className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedMilestoneId === goal.id
                          ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-400 shadow-md'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="milestone"
                        checked={selectedMilestoneId === goal.id}
                        onChange={() => setSelectedMilestoneId(goal.id)}
                        className="w-5 h-5 text-teal-500 focus:ring-teal-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {goal.isPlanGoal && primaryPlan && (
                            <span className="text-2xl">{primaryPlan.icon}</span>
                          )}
                          {!goal.isPlanGoal && (
                            <span className="text-2xl">✨</span>
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {goal.title}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {goal.isPlanGoal 
                            ? (primaryPlan?.name || primaryPlan?.focusBranch || '计划小目标')
                            : '自定义小目标'
                          }
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                
                {/* 添加自定义小目标按钮 */}
                {!showAddGoal && (
                  <button
                    onClick={() => setShowAddGoal(true)}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/60 p-3 flex items-center justify-center gap-2 text-teal-600 transition-all duration-300 transform hover:scale-[1.01]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm font-semibold">
                      {primaryPlan ? '添加自定义小目标（将加入计划）' : '设置自定义小目标'}
                    </span>
                  </button>
                )}
                
                {/* 添加目标输入框 */}
                {showAddGoal && (
                  <div className="flex gap-2 animate-fade-in">
                    <input
                      type="text"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddGoal()}
                      placeholder="输入小目标..."
                      className="flex-1 rounded-xl border-2 border-emerald-200/60 bg-white/80 backdrop-blur-sm px-4 py-2.5 text-teal-900 placeholder:text-teal-400/50 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300/50 transition-all"
                      autoFocus
                    />
                    <button
                      onClick={handleAddGoal}
                      className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2.5 hover:shadow-lg shadow-teal-300/50 transition-all transform hover:scale-105 font-medium"
                    >
                      添加
                    </button>
                    <button
                      onClick={() => {
                        setShowAddGoal(false);
                        setNewGoalTitle('');
                      }}
                      className="rounded-xl bg-white/80 border border-emerald-200/60 text-teal-600 px-4 py-2.5 hover:bg-emerald-50 transition-all font-medium"
                    >
                      取消
                    </button>
                  </div>
                )}

                {/* 确认小目标按钮 */}
                <button
                  onClick={handleConfirmGoal}
                  disabled={!selectedMilestoneId}
                  className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  确认这个小目标
                </button>
              </div>
            ) : (
              // 没有小目标时，显示添加小目标的提示
              <div className="text-center py-4 space-y-4">
                <p className="text-gray-600 mb-4">
                  {primaryPlan ? '还没有小目标，添加一个开始吧！' : '还没有创建计划，先从自由专注开始吧！'}
                </p>
                
                {primaryPlan ? (
                  // 有计划但没有小目标，显示添加按钮
                  <button
                    onClick={() => setShowAddGoal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 font-medium transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    添加第一个小目标
                  </button>
                ) : (
                  // 没有计划，显示自由专注（默认15分钟）
                  <button
                    onClick={() => {
                      router.push('/focus?duration=15&quickStart=true');
                      handleClose();
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 font-medium transition-all shadow-lg hover:shadow-xl"
                  >
                    开始自由专注（15分钟）
                  </button>
                )}
                
                {/* 添加目标输入框（没有小目标时） */}
                {showAddGoal && (
                  <div className="flex gap-2 animate-fade-in max-w-md mx-auto">
                    <input
                      type="text"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddGoal()}
                      placeholder="输入小目标..."
                      className="flex-1 rounded-xl border-2 border-emerald-200/60 bg-white/80 backdrop-blur-sm px-4 py-2.5 text-teal-900 placeholder:text-teal-400/50 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300/50 transition-all"
                      autoFocus
                    />
                    <button
                      onClick={handleAddGoal}
                      className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2.5 hover:shadow-lg shadow-teal-300/50 transition-all transform hover:scale-105 font-medium"
                    >
                      添加
                    </button>
                    <button
                      onClick={() => {
                        setShowAddGoal(false);
                        setNewGoalTitle('');
                      }}
                      className="rounded-xl bg-white/80 border border-emerald-200/60 text-teal-600 px-4 py-2.5 hover:bg-emerald-50 transition-all font-medium"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 分隔线 */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">或者</span>
              </div>
            </div>

            {/* 选项2：快速启动 */}
            <div className="space-y-3">
              <button
                onClick={handleQuickStart}
                className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-xl hover:from-orange-600 hover:to-pink-700 font-medium transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                快速启动（{primaryPlan ? dailyGoalMinutes : 15}分钟）
              </button>
              <p className="text-xs text-center text-gray-500">
                {primaryPlan ? '直接进入专注，使用每日目标时长' : '直接进入专注，默认15分钟'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
        :global(.animate-fade-in) {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

