'use client';

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
const INTERESTS: Interest[] = [
  // 第一行 - 创造表达
  { id: '1', name: '游戏', icon: '🎮', color: 'bg-purple-100 border-purple-300 text-purple-700' },
  { id: '2', name: '阅读', icon: '📚', color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { id: '3', name: '绘画', icon: '🎨', color: 'bg-pink-100 border-pink-300 text-pink-700' },
  { id: '4', name: '音乐', icon: '🎵', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  
  // 第二行 - 技能成长  
  { id: '5', name: '编程', icon: '💻', color: 'bg-indigo-100 border-indigo-300 text-indigo-700' },
  { id: '6', name: '语言', icon: '🗣️', color: 'bg-green-100 border-green-300 text-green-700' },
  { id: '7', name: '健身', icon: '💪', color: 'bg-red-100 border-red-300 text-red-700' },
  { id: '8', name: '厨艺', icon: '🍳', color: 'bg-orange-100 border-orange-300 text-orange-700' },
  
  // 第三行 - 生活探索
  { id: '9', name: '手工', icon: '🧵', color: 'bg-teal-100 border-teal-300 text-teal-700' },
  { id: '10', name: '学科', icon: '🎓', color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { id: '11', name: '观影', icon: '🎬', color: 'bg-rose-100 border-rose-300 text-rose-700' },
  { id: '12', name: '写作', icon: '✍️', color: 'bg-cyan-100 border-cyan-300 text-cyan-700' }
];


export default function InterestGrid({ onSelectionChange }: InterestGridProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInterest, setCustomInterest] = useState('');
  const maxSelection = 3;

  // 在 InterestGrid.tsx 中更新自定义兴趣处理逻辑
const handleAddCustomInterest = () => {
  if (customInterest.trim() && selectedInterests.length < maxSelection) {
    // 创建完整的自定义兴趣对象，而不仅仅是ID
    const customInterestObj: Interest = {
      id: `custom-${Date.now()}`,
      name: customInterest.trim(),
      icon: '😊', // 使用笑脸作为自定义兴趣的图标
      color: 'bg-gray-100 border-gray-300 text-gray-700',
    };
    
    // 存储完整的兴趣对象，而不仅仅是ID
    const newSelection = [...selectedInterests, customInterestObj.id];
    setSelectedInterests(newSelection);
    
    // 将完整的兴趣对象传递给父组件
    if (typeof onSelectionChange === 'function') {
      onSelectionChange(newSelection, [...(selectedInterestObjects || []), customInterestObj]);
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
        <p className="text-gray-600 text-lg">
          选择你感兴趣的领域（最多3个）
          {selectedInterests.length > 0 && (
            <span className="text-blue-600 font-medium ml-2">
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
          p-3 sm:p-4 rounded-2xl  // 增加内边距
          border-2 transition-all duration-300 transform
          hover:scale-105 active:scale-95
          aspect-square
          ${isSelected 
            ? `${interest.color} border-current scale-105 shadow-lg` 
            : isDisabled
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-md'
          }
        `}
      >
        {/* 增大图标尺寸 */}
        <span className="text-3xl sm:text-4xl mb-2 sm:mb-3">{interest.icon}</span>
        
        {/* 增大文字尺寸并确保单行显示 */}
        <span className="text-sm sm:text-base font-medium leading-tight text-center">
          {interest.name}
        </span>
        
        {/* 选中状态指示器 - 稍微增大 */}
        {isSelected && (
          <div className="mt-2 sm:mt-3 w-2.5 h-2.5 bg-current rounded-full"></div>
        )}
      </button>
    );
  })}
</div>

      {/* 自定义兴趣输入 */}
      {showCustomInput ? (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <input
            type="text"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            placeholder="输入你的自定义兴趣..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => setShowCustomInput(false)}
              className="px-3 py-1 text-gray-600 hover:text-gray-800"
            >
              取消
            </button>
            <button
              onClick={handleAddCustomInterest}
              disabled={!customInterest.trim()}
              className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
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
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + 添加自定义兴趣
          </button>
        </div>
      )}
    </div>
  );
}