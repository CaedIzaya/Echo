'use client';

import React from 'react';

interface EchoSpiritMobileProps {
  state?: 'idle' | 'excited' | 'focus' | 'happy' | 'nod';
  className?: string;
  onClick?: () => void;
}

export default function EchoSpiritMobile({ 
  state = 'idle', 
  className = '',
  onClick 
}: EchoSpiritMobileProps) {
  // 根据状态获取颜色配置
  const getColors = () => {
    switch (state) {
      case 'focus':
        return {
          glowStart: '#B9D4FF',
          glowEnd: '#8FA0FF',
          body: '#E9F2FF',
          glowOpacity: '0.55'
        };
      case 'excited':
      case 'happy':
      case 'nod':
        return {
          glowStart: '#FFE7A0',
          glowEnd: '#FFD65C',
          body: '#FFFBE3',
          glowOpacity: '0.9'
        };
      default: // idle
        return {
          glowStart: '#FFD27F',
          glowEnd: '#FFB84D',
          body: '#FFE09A',
          glowOpacity: '1'
        };
    }
  };

  const colors = getColors();

  // 根据状态获取动画类名
  const getAnimationClass = () => {
    if (state === 'focus') return 'spirit-animate-focus';
    if (state === 'excited' || state === 'happy' || state === 'nod') return 'spirit-animate-happy';
    return 'spirit-animate-idle';
  };

  return (
    <>
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        className={`spirit-svg ${getAnimationClass()} ${className}`}
        onClick={onClick}
        role="img"
        aria-label="Echo 小精灵"
        tabIndex={0}
      >
        <defs>
          {/* 外圈光晕渐变 */}
          <radialGradient id={`glow-${state}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.glowStart} stopOpacity={colors.glowOpacity} />
            <stop offset="100%" stopColor={colors.glowEnd} stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* 外圈光晕 */}
        <circle cx="60" cy="60" r="45" fill={`url(#glow-${state})`} />
        
        {/* 身体圆形 */}
        <circle cx="60" cy="60" r="32" fill={colors.body} />
        
        {/* 眼睛（偏上，大间距） */}
        <ellipse cx="48" cy="48" rx="6" ry="10" fill="#3A2F2F" />
        <ellipse cx="72" cy="48" rx="6" ry="10" fill="#3A2F2F" />
        
        {/* 高光 */}
        <circle cx="52" cy="42" r="3" fill="white" opacity="0.7" />
        <circle cx="68" cy="42" r="3" fill="white" opacity="0.7" />
      </svg>
      <style jsx>{`
        .spirit-svg {
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          transform-origin: center center;
        }

        .spirit-svg:active {
          transform: scale(0.95);
          transition: transform 0.1s;
        }

        .spirit-svg:focus {
          outline: 2px solid rgba(255, 170, 80, 0.3);
          outline-offset: 4px;
          border-radius: 50%;
        }

        /* idle 动画 */
        .spirit-animate-idle {
          animation: spiritFloatIdle 3s ease-in-out infinite;
        }

        @keyframes spiritFloatIdle {
          0% { 
            transform: scale(1) rotate(0deg);
          }
          50% { 
            transform: scale(1.04) rotate(1.5deg);
          }
          100% { 
            transform: scale(1) rotate(0deg);
          }
        }

        /* focus 动画 */
        .spirit-animate-focus {
          animation: spiritFloatFocus 5s ease-in-out infinite;
        }

        @keyframes spiritFloatFocus {
          0% { 
            transform: scale(1) rotate(0deg);
          }
          50% { 
            transform: scale(1.02) rotate(0.5deg);
          }
          100% { 
            transform: scale(1) rotate(0deg);
          }
        }

        /* happy 动画 */
        .spirit-animate-happy {
          animation: spiritFloatHappy 2s ease-in-out infinite;
        }

        @keyframes spiritFloatHappy {
          0% { 
            transform: scale(1) rotate(0deg);
          }
          50% { 
            transform: scale(1.06) rotate(2deg);
          }
          100% { 
            transform: scale(1) rotate(0deg);
          }
        }
      `}</style>
    </>
  );
}

