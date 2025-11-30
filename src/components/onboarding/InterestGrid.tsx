import React, { useState } from 'react';

// 定义兴趣标签类型
interface Interest {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface InterestGridProps {
  onSelectionChange: (selectedIds: string[], selectedObjects?: Interest[]) => void;
}

// 精选的3x4兴趣网格 - 在组件内部定义
// 使用与其他页面统一的emoji风格
const INTERESTS: Interest[] = [
  // 第一行 - 创造表达
  { id: '1', name: '游戏', icon: '🎮', color: 'bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200 text-teal-700' },
  { id: '2', name: '阅读', icon: '📚', color: 'bg-gradient-to-br from-teal-50 to-sky-50 border-teal-200 text-teal-700' },
  { id: '3', name: '绘画', icon: '🎨', color: 'bg-gradient-to-br from-emerald-50 via-white to-teal-100 border-teal-200 text-teal-700' },
  { id: '4', name: '音乐', icon: '🎵', color: 'bg-gradient-to-br from-cyan-50 to-emerald-50 border-cyan-200 text-teal-700' },
  
  // 第二行 - 技能成长  
  { id: '5', name: '编程', icon: '💻', color: 'bg-gradient-to-br from-teal-50 to-emerald-100 border-teal-200 text-teal-700' },
  { id: '6', name: '语言', icon: '🗣️', color: 'bg-gradient-to-br from-emerald-50 to-cyan-100 border-emerald-200 text-teal-700' },
  { id: '7', name: '健身', icon: '💪', color: 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 text-teal-700' },
  { id: '8', name: '厨艺', icon: '🍳', color: 'bg-gradient-to-br from-sky-50 to-emerald-100 border-sky-200 text-teal-700' },
  
  // 第三行 - 生活探索
  { id: '9', name: '手工', icon: '🧵', color: 'bg-gradient-to-br from-emerald-50 to-cyan-100 border-emerald-200 text-teal-700' },
  { id: '10', name: '学科', icon: '🎓', color: 'bg-gradient-to-br from-teal-50 to-sky-100 border-teal-200 text-teal-700' },
  { id: '11', name: '观影', icon: '🎬', color: 'bg-gradient-to-br from-cyan-50 to-emerald-100 border-cyan-200 text-teal-700' },
  { id: '12', name: '写作', icon: '✍️', color: 'bg-gradient-to-br from-emerald-50 via-white to-cyan-100 border-emerald-200 text-teal-700' }
];

// 导出图标列表供其他组件使用
export const PLAN_ICONS = INTERESTS.map(interest => ({
  icon: interest.icon,
  label: interest.name
}));


export default function InterestGrid({ onSelectionChange }: InterestGridProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInterest, setCustomInterest] = useState('');
  const maxSelection = 3;

  // 在 InterestGrid.tsx 中更新自定义兴趣处理逻辑
  const handleAddCustomInterest = () => {
    if (customInterest.trim() && selectedInterests.length < maxSelection) {
      // 创建完整的自定义兴趣对象
      const customInterestObj: Interest = {
        id: `custom-${Date.now()}`,
        name: customInterest.trim(),
        icon: '😊',
        color: 'bg-gray-100 border-gray-300 text-gray-700',
      };
      
      // 同时更新ID数组和对象数组
      const newSelection = [...selectedInterests, customInterestObj.id];
      const newObjects = [...selectedInterestObjects, customInterestObj];
      
      setSelectedInterests(newSelection);
      setSelectedInterestObjects(newObjects);
      
      // 传递完整的兴趣对象数组给父组件
      if (typeof onSelectionChange === 'function') {
        onSelectionChange(newSelection, newObjects);
      }
      
      setCustomInterest('');
      setShowCustomInput(false);
    }
  };

// 添加状态来存储完整的兴趣对象
const [selectedInterestObjects, setSelectedInterestObjects] = useState<Interest[]>([]);

// 更新处理函数
const handleInterestClick = (interest: Interest) => {
  let newSelection: string[];
  let newObjects: Interest[];
  
  if (selectedInterests.includes(interest.id)) {
    // 取消选择
    newSelection = selectedInterests.filter(id => id !== interest.id);
    newObjects = selectedInterestObjects.filter(obj => obj.id !== interest.id);
  } else {
    // 选择（不超过最大数量）
    if (selectedInterests.length >= maxSelection) return;
    newSelection = [...selectedInterests, interest.id];
    newObjects = [...selectedInterestObjects, interest];
  }
  
  setSelectedInterests(newSelection);
  setSelectedInterestObjects(newObjects);
  
  // 传递ID数组和完整对象数组
  if (typeof onSelectionChange === 'function') {
    onSelectionChange(newSelection, newObjects);
  }
};

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 选择提示 */}
      <div className="text-center mb-8">
        <p className="text-teal-700 text-base sm:text-lg font-medium">
          选择你感兴趣的领域（最多3个）
          {selectedInterests.length > 0 && (
            <span className="text-teal-500 font-semibold ml-2">
              {selectedInterests.length}/{maxSelection}
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-4">
  {INTERESTS.map((interest) => {
    const isSelected = selectedInterests.includes(interest.id);
    const isDisabled = !isSelected && selectedInterests.length >= maxSelection;
    
    return (
      <button
        key={interest.id}
        onClick={() => handleInterestClick(interest)}
        disabled={isDisabled}
        className={`
          flex flex-col items-center justify-center 
          p-3 sm:p-4 rounded-2xl
          border-2 transition-all duration-300 transform
          hover:scale-105 active:scale-95
          aspect-square
          ${isSelected 
            ? `${interest.color} border-transparent ring-2 ring-white/70 scale-105 shadow-[0_15px_45px_-20px_rgba(13,148,136,0.8)]` 
            : isDisabled
            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
            : 'bg-white/80 border-emerald-50 text-teal-700 hover:border-teal-200 hover:shadow-md'
          }
        `}
      >
        {/* 增大图标尺寸 */}
        <span className="text-3xl sm:text-4xl mb-2 sm:mb-3">{interest.icon}</span>
        
        {/* 增大文字尺寸并确保单行显示 */}
        <span className="text-base sm:text-lg font-semibold leading-tight text-center text-teal-800">
          {interest.name}
        </span>
        
        {/* 选中状态指示器 - 稍微增大 */}
        {isSelected && (
          <div className="mt-2 sm:mt-3 w-2.5 h-2.5 bg-white/80 rounded-full border border-white/70"></div>
        )}
      </button>
    );
  })}
</div>

      {/* 自定义兴趣输入 */}
      {showCustomInput ? (
        <div className="mt-4 p-4 bg-emerald-50/70 rounded-lg border border-emerald-100">
          <input
            type="text"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            placeholder="输入你的自定义兴趣..."
            className="w-full px-3 py-2 border border-emerald-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            autoFocus
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => setShowCustomInput(false)}
              className="px-3 py-1 text-teal-500 hover:text-teal-600"
            >
              取消
            </button>
            <button
              onClick={handleAddCustomInterest}
              disabled={!customInterest.trim()}
              className="px-3 py-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded disabled:opacity-40"
            >
              添加
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 text-center">
          <button 
            onClick={() => setShowCustomInput(true)}
            disabled={selectedInterests.length >= maxSelection}
            className="text-teal-500 hover:text-teal-600 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + 添加自定义兴趣
          </button>
        </div>
      )}
    </div>
  );
}