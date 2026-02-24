import React, { useState, useEffect } from 'react';
import { getAchievementManager } from '~/lib/AchievementSystem';

export interface FinalGoal {
  content: string;
  createdAt: string;
  isCompleted: boolean;
  completedAt?: string;
}

interface MilestoneManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: FinalGoal | undefined) => void; // undefined 表示删除
  initialGoal?: FinalGoal;
  planName?: string;
}

export default function MilestoneManager({ isOpen, onClose, onSave, initialGoal, planName }: MilestoneManagerProps) {
  const [milestone, setMilestone] = useState<FinalGoal | undefined>(initialGoal);
  const [inputValue, setInputValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [showCreateSuccess, setShowCreateSuccess] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);

  // 初始化加载数据
  useEffect(() => {
    if (isOpen) {
      setMilestone(initialGoal);
      setShowCompletionPrompt(false);
      setShowCreateSuccess(false);
      setShowConfirmComplete(false);
      setIsCreating(!initialGoal); // 如果没有初始目标，直接进入创建模式
      setInputValue('');
    }
  }, [isOpen, initialGoal]);

  const handleCreate = () => {
    if (!inputValue.trim()) return;

    const newMilestone: FinalGoal = {
      content: inputValue.trim(),
      createdAt: new Date().toISOString(),
      isCompleted: false
    };

    setMilestone(newMilestone);
    onSave(newMilestone);
    setInputValue('');
    setIsCreating(false);
    
    // 🎉 显示设置成功提示
    alert('✅ 终极目标已设定！');
    
    // 关闭弹窗
    onClose();

    // 触发成就：设置新终极目标（如果是第一次，会由系统判断）
    const manager = getAchievementManager();
    manager.checkFirstTimeAchievements('milestone_created');
  };

  const handleDelete = () => {
    if (confirm('确定要放弃这个终极目标吗？')) {
      setMilestone(undefined);
      onSave(undefined);
    }
  };

  const handleComplete = () => {
    setShowConfirmComplete(true);
  };

  const confirmCompleteAction = () => {
    // 播放音效（可选）
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 523.25; // C5
      oscillator.type = 'sine';
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      // ignore
    }

    if (milestone) {
        const completedGoal = { ...milestone, isCompleted: true, completedAt: new Date().toISOString() };
        setMilestone(completedGoal);
        onSave(completedGoal);
        
        // 触发成就：完成第一个终极目标
        const manager = getAchievementManager();
        manager.checkFirstTimeAchievements('milestone_completed');
    }
    setShowConfirmComplete(false);
    setShowCompletionPrompt(true);
  };

  const handleCreateNewAfterComplete = () => {
    setMilestone(undefined);
    setShowCompletionPrompt(false);
    setIsCreating(true); // 进入创建模式
    // 注意：这里不需要立即调用 onSave(undefined)，因为我们要让用户创建新的
  };

  const handleLaterAfterComplete = () => {
    // 保持已完成状态
    setShowCompletionPrompt(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl transform transition-all animate-scale-in relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-amber-600"></div>
        
        {/* 关闭按钮 */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
        >
          ✕
        </button>

        {/* 标题 */}
        <div className="text-center mb-6 mt-2">
          <span className="text-4xl mb-2 block">🚩</span>
          <h2 className="text-xl font-bold text-gray-900">终极目标管理</h2>
          {planName && <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{planName}</p>}
          <p className="text-sm text-gray-500 mt-1">设立一个值得征服的目标</p>
        </div>

        {/* 完成后的提示 */}
        {showCreateSuccess ? (
          <div className="text-center py-8 space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <span className="text-4xl">✨</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">新终极目标已成功创建！</h3>
              <p className="text-gray-500">所有的伟大旅程，都始于足下。</p>
            </div>
            <button
              onClick={() => setShowCreateSuccess(false)}
              className="w-full py-3 bg-teal-500 text-white rounded-xl font-medium shadow-lg hover:bg-teal-600 transition-all"
            >
              知道了
            </button>
          </div>
        ) : showConfirmComplete ? (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl">🤔</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-900">确认完成终极目标？</h3>
              <p className="text-gray-500 px-4">这也意味着一段旅程的结束。确定要标记为完成吗？</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmComplete(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmCompleteAction}
                className="flex-1 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-medium shadow-lg hover:shadow-green-500/40 transition-all"
              >
                确认完成
              </button>
            </div>
          </div>
        ) : showCompletionPrompt ? (
          <div className="text-center py-4 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-green-600">🎉 恭喜达成终极目标！</h3>
              <p className="text-gray-600">这片领土已被你征服。准备好开始新的征程了吗？</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateNewAfterComplete}
                className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-all transform hover:-translate-y-0.5"
              >
                设立新目标
              </button>
              <button
                onClick={handleLaterAfterComplete}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                回顾成就
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 内容区域 */}
            {!milestone || isCreating ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800">
                  <p className="mb-2 font-semibold">建议设立什么样的终极目标？</p>
                  <ul className="list-disc list-inside space-y-1 opacity-90">
                    <li>具有挑战性但可实现的阶段性目标</li>
                    <li>完成后能带来强烈成就感的任务</li>
                    <li>一个长期的终极愿景</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">终极目标内容</label>
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="例如：完成第一个全马、读完50本书、学会一门新语言..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all resize-none h-32"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (milestone && !isCreating) {
                        setIsCreating(false); // 取消创建，回到查看模式
                      } else {
                        onClose(); // 没有里程碑时取消就是关闭
                      }
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!inputValue.trim()}
                    className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    设立终极目标
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl border border-yellow-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-6xl">🚩</span>
                  </div>
                  <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2">CURRENT GOAL</h3>
                  <p className="text-xl font-bold text-gray-800 leading-relaxed">
                    {milestone.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-4">
                    设立于 {new Date(milestone.createdAt).toLocaleDateString()}
                    {milestone.isCompleted && <span className="ml-2 text-green-500 font-bold">✓ 已完成</span>}
                  </p>
                </div>

                <div className="flex gap-3">
                  {!milestone.isCompleted ? (
                    <>
                        <button
                            onClick={handleDelete}
                            className="px-6 py-3 bg-red-50 text-red-500 rounded-xl font-medium hover:bg-red-100 transition-colors"
                        >
                            放弃
                        </button>
                        <button
                            onClick={handleComplete}
                            className="flex-1 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-medium shadow-lg shadow-green-500/30 hover:shadow-green-500/40 transition-all transform hover:-translate-y-0.5"
                        >
                            完成终极目标
                        </button>
                    </>
                  ) : (
                    <button
                        onClick={handleCreateNewAfterComplete} // 使用这个函数进入创建新目标
                        className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-all"
                    >
                        开启新的征程
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
