import React, { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  focusBranch?: string;
  icon: string;
  dailyGoalMinutes: number;
  milestones: Milestone[];
  isActive: boolean;
  isPrimary?: boolean;
  isCompleted?: boolean;
  isBlank?: boolean;
}

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

interface EditPlanModalProps {
  plan: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (planId: string, updates: { name: string; focusBranch: string; dailyGoalMinutes: number }) => void;
}

// 预设时间选项
const TIME_OPTIONS = [15, 30, 45, 60];

export default function EditPlanModal({ plan, isOpen, onClose, onSave }: EditPlanModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    focusBranch: '',
    dailyMinTime: 30,
  });
  const [customTimeInput, setCustomTimeInput] = useState('');

  // 当计划数据变化时，更新表单数据
  useEffect(() => {
    if (plan && isOpen) {
      setFormData({
        name: plan.name || '',
        focusBranch: plan.focusBranch || '',
        dailyMinTime: plan.dailyGoalMinutes || 30,
      });
      setCustomTimeInput('');
    }
  }, [plan, isOpen]);

  // 检查是否选择了预设时间
  const isPresetSelected = TIME_OPTIONS.includes(formData.dailyMinTime);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'dailyMinTime') {
      setCustomTimeInput('');
    }
  };

  const handleCustomTimeChange = (value: string) => {
    setCustomTimeInput(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 480) {
      handleInputChange('dailyMinTime', numValue);
    } else if (value === '') {
      handleInputChange('dailyMinTime', 0);
    }
  };

  const handleSave = () => {
    if (!plan) return;
    
    if (!formData.name.trim()) {
      alert('请输入计划名称');
      return;
    }
    
    if (!formData.focusBranch.trim()) {
      alert('请输入计划分支');
      return;
    }
    
    if (formData.dailyMinTime <= 0) {
      alert('请设置每日最小专注时长');
      return;
    }

    onSave(plan.id, {
      name: formData.name.trim(),
      focusBranch: formData.focusBranch.trim(),
      dailyGoalMinutes: formData.dailyMinTime,
    });
    
    onClose();
  };

  if (!isOpen || !plan) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 弹窗头部 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-semibold text-gray-900">编辑计划</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 弹窗内容 */}
          <div className="p-6 space-y-6">
            {/* 计划名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                计划名称
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="输入计划名称"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* 计划分支 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                计划分支
              </label>
              <input
                type="text"
                value={formData.focusBranch}
                onChange={(e) => handleInputChange('focusBranch', e.target.value)}
                placeholder="输入计划分支"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* 每日最小专注时长 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                每日最小专注时长
              </label>
              
              {/* 预设时间选项 */}
              <div className="flex flex-wrap gap-4 mb-4">
                {TIME_OPTIONS.map((time) => {
                  const isSelected = formData.dailyMinTime === time && isPresetSelected;
                  return (
                    <button
                      key={time}
                      onClick={() => {
                        handleInputChange('dailyMinTime', time);
                        setCustomTimeInput('');
                      }}
                      className={`
                        px-6 py-3 rounded-lg border-2 transition-all duration-200
                        ${isSelected
                          ? 'bg-teal-500 text-white border-teal-500 shadow-md'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-teal-300 hover:bg-teal-50'}
                      `}
                    >
                      <span className="text-lg font-semibold">{time}</span>
                      <span className="text-sm ml-1">分钟</span>
                    </button>
                  );
                })}
              </div>

              {/* 自定义输入 */}
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={isPresetSelected ? '' : (customTimeInput || formData.dailyMinTime.toString())}
                  onChange={(e) => handleCustomTimeChange(e.target.value)}
                  placeholder="或输入自定义分钟数"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  分钟
                </span>
              </div>
            </div>
          </div>

          {/* 弹窗底部按钮 */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </>
  );
}






