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
  { id: '7', name: '运动', icon: '🏃', color: 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 text-teal-700' },
  { id: '8', name: '厨艺', icon: '🍳', color: 'bg-gradient-to-br from-sky-50 to-emerald-100 border-sky-200 text-teal-700' },
  
  // 第三行 - 生活探索
  { id: '9', name: '社交', icon: '🤝', color: 'bg-gradient-to-br from-emerald-50 to-cyan-100 border-emerald-200 text-teal-700' },
  { id: '10', name: '自学', icon: '🎓', color: 'bg-gradient-to-br from-teal-50 to-sky-100 border-teal-200 text-teal-700' },
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
  const [selectedInterestObjects, setSelectedInterestObjects] = useState<Interest[]>([]);
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
    <div className="relative w-full max-w-5xl mx-auto py-10">
      <div className="grid grid-cols-6 gap-4 sm:gap-6 md:gap-8 px-4 justify-items-center">
        {INTERESTS.map((interest, index) => {
          const isSelected = selectedInterests.includes(interest.id);
          const isDisabled = !isSelected && selectedInterests.length >= maxSelection;
          
          return (
            <button
              key={interest.id}
              onClick={() => handleInterestClick(interest)}
              disabled={isDisabled}
              style={{ 
                animationDelay: `${index * 0.1}s`,
              }}
              className={`
                bubble-tile group relative flex aspect-square w-20 sm:w-24 md:w-28 flex-col items-center justify-center rounded-full border text-center transition-all duration-500 will-change-transform
                ${isSelected
                  ? 'bg-white text-slate-900 border-transparent shadow-[0_0_40px_rgba(255,255,255,0.5),inset_0_0_20px_rgba(255,255,255,0.3)] scale-110 z-10'
                  : 'bg-white/10 text-white/90 border-white/20 hover:border-white/40 hover:bg-white/15 backdrop-blur-sm'}
                ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
              `}
              style={{
                boxShadow: isSelected 
                  ? '0 0 40px rgba(255,255,255,0.5), inset 0 0 20px rgba(255,255,255,0.3), 0 8px 32px rgba(0,0,0,0.1)'
                  : '0 4px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 1px rgba(255,255,255,0.05)'
              }}
            >
              {/* 气泡高光效果 */}
              <div className="absolute inset-0 rounded-full opacity-30" style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)'
              }} />
              
              {/* 气泡底部反光 */}
              <div className="absolute inset-0 rounded-full opacity-20" style={{
                background: 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2), transparent 50%)'
              }} />
              
              <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-tr from-teal-500/20 via-cyan-500/10 to-sky-500/10 rounded-full" />
              <div className="relative flex flex-col items-center gap-1 z-10">
                <span className="text-3xl sm:text-4xl filter drop-shadow-lg">{interest.icon}</span>
                <span className="text-sm font-medium tracking-wide drop-shadow-md mt-1">{interest.name}</span>
              </div>
              {isSelected && (
                <span className="absolute -right-1 -top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-teal-600 text-xs font-bold shadow-lg">
                  ✓
                </span>
              )}
            </button>
          );
        })}

        {/* 自定义兴趣泡泡 */}
        {showCustomInput ? (
          <div className="relative flex aspect-square w-20 sm:w-24 md:w-28 flex-col items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md p-2 animate-fade-in">
            <input
              type="text"
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              placeholder="输入..."
              className="w-full bg-transparent text-center text-white text-sm placeholder-white/30 focus:outline-none mb-2"
              autoFocus
              maxLength={6}
            />
            <div className="flex gap-1">
              <button onClick={() => setShowCustomInput(false)} className="text-xs text-white/50 hover:text-white">✕</button>
              <button 
                onClick={handleAddCustomInterest}
                disabled={!customInterest.trim()} 
                className="text-xs text-teal-300 hover:text-teal-200 font-bold"
              >
                ✓
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setShowCustomInput(true)}
            disabled={selectedInterests.length >= maxSelection}
            className={`
              bubble-tile relative flex aspect-square w-20 sm:w-24 md:w-28 flex-col items-center justify-center rounded-full border border-dashed border-white/30 
              bg-white/5 text-white/60 transition-all hover:border-white/50 hover:text-white/90 hover:bg-white/10 backdrop-blur-sm
              ${selectedInterests.length >= maxSelection ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{
              boxShadow: '0 4px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 1px rgba(255,255,255,0.05)'
            }}
          >
            {/* 气泡高光效果 */}
            <div className="absolute inset-0 rounded-full opacity-20" style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent 60%)'
            }} />
            <span className="text-2xl mb-1">+</span>
            <span className="text-xs">自定义</span>
          </button>
        )}
      </div>

      <style jsx>{`
        .bubble-tile {
          animation: bubbleFloat 6s ease-in-out infinite;
          transform-origin: center center;
        }
        @keyframes bubbleFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
}