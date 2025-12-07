'use client';

import React, { useState } from 'react';

interface HeartTreeSeedlingProps {
  animState?: 'idle' | 'watering' | 'fertilizing';
}

export const HeartTreeSeedling: React.FC<HeartTreeSeedlingProps> = ({ animState = 'idle' }) => {
  const [isWatering, setIsWatering] = useState(false);
  const [isFertilizing, setIsFertilizing] = useState(false);

  // 根据 animState 更新内部状态
  React.useEffect(() => {
    if (animState === 'watering') {
      setIsWatering(true);
      setTimeout(() => setIsWatering(false), 2000);
    } else if (animState === 'fertilizing') {
      setIsFertilizing(true);
      setTimeout(() => setIsFertilizing(false), 2000);
    }
  }, [animState]);

  const handleTreeClick = () => {
    // 可以添加点击交互
  };

  // 幼苗阶段配置
  const treeHeight = 90;
  const topY = 230 - treeHeight;
  // 主干顶端分叉点（Y 的节点）
  const forkY = topY + 12;

  return (
    <div className="w-full h-full max-w-[460px] max-h-[460px] select-none flex items-center justify-center relative">
      <svg
        viewBox="0 0 120 250"
        className="w-full h-auto max-w-xs mx-auto cursor-pointer tree-svg tree-seedling"
        onClick={handleTreeClick}
        data-anim-state={animState}
        style={{ 
          // Add a subtle breathing animation to the whole tree
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))',
          transition: 'all 1s ease-in-out'
        }}
      >
        <defs>
          {/* Trunk Gradient: Richer, rounded feel */}
          <linearGradient id="trunkGradientSeedling" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6D4C41" />
            <stop offset="40%" stopColor="#8D6E63" />
            <stop offset="100%" stopColor="#5D4037" />
          </linearGradient>
          
          {/* Sprout Glow: Subtle energy behind the leaves */}
          <radialGradient id="sproutGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#90EE90" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#90EE90" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. 地面 */}
        <ellipse cx="60" cy="240" rx="100" ry="8" fill="#8B4513" opacity="0.3" />
        
        {/* 2. 主干：从地面到分叉点 */}
        <path
          d={`M60,240 Q65,${240 - treeHeight * 0.6} 60,${forkY + 5} Q55,${forkY} 60,${forkY - 4}`}
          stroke="#8B4513"
          strokeWidth="3"
          fill="none"
          className={isWatering || isFertilizing ? 'animate-pulse' : ''}
        />
        
        {/* 3. Y 形左分支 */}
        <path
          d={`M60,${forkY - 4} Q55,${forkY - 10} 50,${forkY - 14}`}
          stroke="#8B4513"
          strokeWidth="2.2"
          fill="none"
        />
        
        {/* 4. Y 形右分支（稍微偏上） */}
        <path
          d={`M60,${forkY - 4} Q65,${forkY - 12} 70,${forkY - 16}`}
          stroke="#8B4513"
          strokeWidth="2.2"
          fill="none"
        />
        
        {/* 5. 右侧小树干 / 小侧枝（从主干中段往右上伸） */}
        <path
          d={`M60,${forkY + 4} Q68,${forkY} 76,${forkY - 6}`}
          stroke="#A0522D"
          strokeWidth="2"
          fill="none"
        />
        
        {/* ===== 叶子部分：2 片挂在 Y 上，1 片挂在右侧小枝 ===== */}
        <g className="seedling-leaves foliage-group" style={{ transformOrigin: `60px ${forkY}px` }}>
          {/* 左侧叶子（挂在 Y 左端，略微朝左上） */}
          <ellipse
            cx={50}
            cy={forkY - 16}
            rx={6}
            ry={10}
            fill="#2E8B57"
            className="leaf leaf-1"
            style={{ transformOrigin: `50px ${forkY - 16}px`, transform: 'rotate(-18deg)' }}
          />
          
          {/* 右侧叶子（挂在 Y 右端，略微朝右上） */}
          <ellipse
            cx={70}
            cy={forkY - 18}
            rx={6}
            ry={10}
            fill="#3CB371"
            className="leaf leaf-2"
            style={{ transformOrigin: `70px ${forkY - 18}px`, transform: 'rotate(16deg)' }}
          />
          
          {/* 右侧小枝叶子（自然斜着） */}
          <ellipse
            cx={80}
            cy={forkY - 10}
            rx={5.5}
            ry={9}
            fill="#90EE90"
            className="leaf leaf-3"
            style={{ transformOrigin: `80px ${forkY - 10}px`, transform: 'rotate(28deg)' }}
          />
        </g>
        
        {/* 6. 浇水动画 */}
        {isWatering && (
          <g className="water-drops">
            {[...Array(3)].map((_, i) => (
              <circle
                key={i}
                cx={60}
                cy={forkY + 20 + i * 12}
                r="3"
                fill="#3b82f6"
                className="water-drop"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </g>
        )}
        
        {/* 7. 施肥动画 */}
        {isFertilizing && (
          <g className="sparkles">
            {[...Array(4)].map((_, i) => {
              const angle = (i * 360) / 4;
              const rad = (angle * Math.PI) / 180;
              return (
                <circle
                  key={i}
                  cx={60 + Math.cos(rad) * 12}
                  cy={forkY + 15 + Math.sin(rad) * 12}
                  r="3"
                  fill="#84cc16"
                  className="sparkle"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              );
            })}
          </g>
        )}

        <style jsx>{`
          .tree-seedling {
            width: 100%;
            height: 100%;
          }

          /* 浇水动画 */
          .water-drop {
            animation: dropFall 0.6s ease-out forwards;
          }

          @keyframes dropFall {
            0% {
              opacity: 1;
              transform: translateY(0);
            }
            100% {
              opacity: 0;
              transform: translateY(30px);
            }
          }

          /* 施肥动画 */
          .sparkle {
            animation: sparklePop 0.6s ease-out forwards;
          }

          @keyframes sparklePop {
            0% {
              opacity: 0;
              transform: scale(0);
            }
            50% {
              opacity: 1;
              transform: scale(1.2);
            }
            100% {
              opacity: 0;
              transform: scale(0.8);
            }
          }

          /* 树反应动画 */
          .tree-seedling[data-anim-state="watering"] .foliage-group {
            animation: treeHydrate 0.8s cubic-bezier(0.2, 1.5, 0.5, 1) forwards;
            animation-delay: 0.5s;
          }

          .tree-seedling[data-anim-state="fertilizing"] .foliage-group {
            animation: powerPop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            animation-delay: 0.6s;
          }

          @keyframes treeHydrate {
            0% { transform: scale(1, 1); }
            20% { transform: scale(1.05, 0.9); }
            50% { transform: scale(0.95, 1.05); }
            80% { transform: scale(1.02, 0.98); }
            100% { transform: scale(1, 1); }
          }

          @keyframes powerPop {
            0% { transform: scale(1); }
            40% { transform: scale(1.08); }
            70% { transform: scale(0.97); }
            100% { transform: scale(1); }
          }
        `}</style>
      </svg>
    </div>
  );
};

