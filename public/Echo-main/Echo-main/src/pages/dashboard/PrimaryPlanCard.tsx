import React, { useState } from 'react';
import { useRouter } from 'next/router';

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  isPending?: boolean; // 待确认状态
  order: number;
}

interface PrimaryPlanCardProps {
  plan: {
    id: string;
    name: string;
    focusBranch?: string; // 计划分支
    icon: string;
    dailyGoalMinutes: number;
    milestones: Milestone[];
  } | null;
  onMilestoneToggle?: (milestoneId: string) => void;
  onBulkMilestoneToggle?: (milestoneIds: string[]) => void;
  onGoalCountIncrement?: (count: number) => void;
}

export default function PrimaryPlanCard({ plan, onMilestoneToggle, onBulkMilestoneToggle, onGoalCountIncrement }: PrimaryPlanCardProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // 多选支持
  const [isExpanded, setIsExpanded] = useState(false); // 展开/收起状态

  // 播放完成音效 - 使用Web Audio API生成清新的音效
  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 生成一个清新的完成音效（两个音符）
      const frequencies = [523.25, 659.25]; // C5和E5音符
      
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = freq;
          oscillator.type = 'sine'; // 使用正弦波，声音更柔和
          
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        }, index * 100);
      });
    } catch (error) {
      // 如果Web Audio API不可用，忽略错误
      console.log('Web Audio API not available');
    }
  };

  // 切换选中状态
  const handleCheckboxToggle = (milestoneId: string) => {
    setSelectedIds(prev => 
      prev.includes(milestoneId)
        ? prev.filter(id => id !== milestoneId)
        : [...prev, milestoneId]
    );
  };

  // 确认完成所有选中的小目标
  const handleConfirmCompletion = () => {
    const count = selectedIds.length;
    // 批量完成
    if (onBulkMilestoneToggle) {
      onBulkMilestoneToggle(selectedIds);
    } else {
      // 单个完成
      selectedIds.forEach(id => {
        onMilestoneToggle?.(id);
      });
    }
    
    // 增加完成计数（限制最多+3）
    const incrementCount = Math.min(count, 3);
    onGoalCountIncrement?.(incrementCount);
    
    setSelectedIds([]);
    playCompletionSound();
  };

  // 清空所有选中
  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  if (!plan) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          专注模式已启用
        </h3>
        <p className="text-gray-600 mb-6">
          现在可以开始专注了！
        </p>
        <div className="space-y-3">
          <button 
            onClick={() => router.push('/onboarding')}
            className="w-full px-6 py-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 font-medium transition shadow-sm"
          >
            设置项目
          </button>
          <button 
            onClick={() => router.push('/focus')}
            className="w-full px-6 py-3 bg-gray-100 text-gray-900 rounded-full hover:bg-gray-200 font-medium transition"
          >
            直接开始专注
          </button>
        </div>
      </div>
    );
  }

  // 显示未完成的小目标
  const allActiveMilestones = plan.milestones.filter(m => !m.isCompleted);
  // 根据展开状态决定显示的数量
  const activeMilestones = isExpanded 
    ? allActiveMilestones 
    : allActiveMilestones.slice(0, 3); // 折叠时最多显示3个
  
  // 是否还有更多小目标未显示
  const hasMore = allActiveMilestones.length > 3;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6">
      {/* 计划头部 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="text-5xl">{plan.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-gray-900">
              {plan.name || plan.focusBranch}
            </h3>
            <span className="text-xs bg-teal-100 text-teal-600 px-2 py-1 rounded-full">
              主要计划
            </span>
          </div>
          <p className="text-sm text-gray-500">
            每日目标：{plan.dailyGoalMinutes}分钟
          </p>
        </div>
      </div>

      {/* 小目标列表 - 可勾选 */}
      {(activeMilestones.length > 0 || allActiveMilestones.length > 0) ? (
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">小目标</h4>
            {hasMore && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 transition-colors"
              >
                {isExpanded ? (
                  <>
                    收起 <span className="text-lg leading-none">▲</span>
                  </>
                ) : (
                  <>
                    展开全部 ({allActiveMilestones.length}) <span className="text-lg leading-none">▼</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {activeMilestones.map((milestone) => {
              const isSelected = selectedIds.includes(milestone.id);
              return (
                <label
                  key={milestone.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-300 shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleCheckboxToggle(milestone.id)}
                    className="w-5 h-5 rounded border-gray-300 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                  />
                  <div className="flex-1 flex items-center gap-2">
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-white animate-check-mark">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <span className={`text-sm font-medium transition-all duration-300 ${
                      isSelected 
                        ? 'text-gray-900 line-through decoration-teal-500 decoration-2' 
                        : 'text-gray-700'
                    }`}>
                      {milestone.title}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
          
          {/* 统一完成按钮 */}
          {selectedIds.length > 0 && (
            <div className="flex gap-2 mt-4 animate-fade-in">
              <button
                onClick={handleConfirmCompletion}
                className="flex-1 px-4 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 font-medium transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                完成选中 ({selectedIds.length})
              </button>
              <button
                onClick={handleClearSelection}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition"
              >
                取消
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 mb-6 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500">
            {plan.milestones.length > 0 ? '🎉 所有小目标已完成！' : '暂无小目标'}
          </p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="space-y-3">
        <button 
          onClick={() => router.push('/plans')}
          className="w-full px-6 py-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 font-medium transition shadow-sm"
        >
          管理计划
        </button>
      </div>

      <style jsx>{`
        @keyframes check-mark {
          0% {
            opacity: 0;
            transform: scale(0) rotate(-180deg);
          }
          50% {
            transform: scale(1.2) rotate(0deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-check-mark {
          animation: check-mark 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}


