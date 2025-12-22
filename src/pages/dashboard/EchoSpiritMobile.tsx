'use client';

import React, { useEffect, useRef, useState } from 'react';

interface EchoSpiritMobileProps {
  state?: 'idle' | 'excited' | 'focus' | 'happy' | 'nod';
  className?: string;
  onStateChange?: (state: 'idle' | 'excited' | 'focus' | 'happy' | 'nod') => void;
  onClick?: () => void; // 点击回调
  allowFocus?: boolean; // 是否允许focus状态（主页应该设为false）
  isCompleted?: boolean; // 专注是否完成，决定颜色：false=idle颜色，true=completed颜色
}

export default function EchoSpiritMobile({ 
  state = 'idle', 
  className = '',
  onStateChange,
  onClick,
  allowFocus = false,
  isCompleted = false
}: EchoSpiritMobileProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isUserControlledRef = useRef(false); // 标记是否由用户点击控制
  const isAnimatingRef = useRef(false); // 标记是否正在动画中（2s内不可打断）
  const [currentState, setCurrentState] = useState(state);
  // 根据isCompleted获取颜色配置，确保交互时不变色
  // 专注未完成：使用idle颜色（暖黄色）
  // 专注完成后：使用completed颜色（明亮黄色）
  const getColors = () => {
    // focus状态使用蓝色
    if (currentState === 'focus') {
      return {
        glowStart: '#B9D4FF',
        glowEnd: '#8FA0FF',
        body: '#E9F2FF',
        glowOpacity: '0.55'
      };
    }
    
    // 根据isCompleted决定颜色，而不是根据currentState
    if (isCompleted) {
      // 专注完成后：使用completed颜色（明亮黄色）
      return {
        glowStart: '#FFE7A0',
        glowEnd: '#FFD65C',
        body: '#FFFBE3',
        glowOpacity: '0.9'
      };
    } else {
      // 专注未完成：使用idle颜色（暖黄色），无论状态如何
      return {
        glowStart: '#FFD27F',
        glowEnd: '#FFB84D',
        body: '#FFE09A',
        glowOpacity: '1'
      };
    }
  };

  // 同步外部state：如果用户没有主动控制，同步外部state
  // 注意：focus状态不应该在主页显示，如果外部传入focus或用户尝试设置focus，则强制转换为idle
  // 注意：excited状态在手机端不显示特殊动画，会显示为idle状态
  useEffect(() => {
    // 如果当前状态是focus但不允许focus，强制转换为idle
    if (currentState === 'focus' && !allowFocus) {
      setCurrentState('idle');
      isUserControlledRef.current = false;
      if (onStateChange) onStateChange('idle');
      return;
    }
    
    // 如果用户没有主动控制（没有点击过），则同步外部state
    // 但忽略focus状态（focus状态不应该在主页显示）
    if (!isUserControlledRef.current && state !== 'focus') {
      // 如果用户没有主动控制（没有点击过），则同步外部state
      // 但忽略focus状态（focus状态不应该在主页显示）
      setCurrentState(state);
      if (onStateChange) onStateChange(state);
    } else if (state === 'focus' && !allowFocus) {
      // 如果外部传入focus但不允许focus，强制转换为idle
      setCurrentState('idle');
      if (onStateChange) onStateChange('idle');
    }
  }, [state, onStateChange, currentState, allowFocus]);

  // 点击处理逻辑 - 与PC端相同
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleClick = () => {
      // 如果正在动画中（2s内），忽略点击
      if (isAnimatingRef.current) {
        return;
      }
      
      // 调用外部onClick回调（用于触发文案显示）
      if (onClick) {
        onClick();
      }
      
      // 标记为用户控制和正在动画中
      isUserControlledRef.current = true;
      isAnimatingRef.current = true;
      
      // 清除之前的定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      setCurrentState(prev => {
        // 随机选择happy或nod
        const states: ('happy' | 'nod')[] = ['happy', 'nod'];
        const nextState = states[Math.floor(Math.random() * states.length)];
        
        // 通知状态变化
        if (onStateChange) {
          onStateChange(nextState);
        }
        
        // 2秒后自动恢复到idle，并重置用户控制标记和动画标记
        timerRef.current = setTimeout(() => {
          setCurrentState('idle');
          timerRef.current = null;
          // 恢复后允许外部state控制和再次交互
          isUserControlledRef.current = false;
          isAnimatingRef.current = false;
          if (onStateChange) {
            onStateChange('idle');
          }
        }, 2000);
        
        return nextState;
      });
    };

    const handleDoubleClick = () => {
      // 如果不允许focus状态（主页场景），忽略双击事件
      if (!allowFocus) {
        return;
      }
      
      // 清除定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // 切换focus模式（仅在允许focus的场景下）
      setCurrentState(prev => {
        const nextState = prev === 'focus' ? 'idle' : 'focus';
        if (onStateChange) {
          onStateChange(nextState);
        }
        return nextState;
      });
    };

    svg.addEventListener('click', handleClick);
    svg.addEventListener('dblclick', handleDoubleClick);

    return () => {
      svg.removeEventListener('click', handleClick);
      svg.removeEventListener('dblclick', handleDoubleClick);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [onClick, onStateChange, currentState, state, allowFocus]);

  const colors = getColors();

  // 根据当前状态获取动画类名
  const getAnimationClass = () => {
    if (currentState === 'focus') return 'spirit-animate-focus';
    if (currentState === 'happy' || currentState === 'nod') return 'spirit-animate-happy';
    return 'spirit-animate-idle';
  };

  return (
    <>
      <svg
        ref={svgRef}
        width="120"
        height="120"
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        className={`spirit-svg ${getAnimationClass()} ${className}`}
        data-state={currentState}
        data-completed={isCompleted ? 'true' : 'false'}
        role="img"
        aria-label="Echo 小精灵"
        tabIndex={0}
      >
        <defs>
          {/* 外圈光晕 */}
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD27F" stopOpacity="1" />
            <stop offset="100%" stopColor="#FFB84D" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="45" fill="url(#glow)" className="glow-layer" />
        
        {/* 身体圆形 */}
        <circle cx="60" cy="60" r="32" fill={colors.body} />
        
        {/* 腮红 - 新增，位于身体和眼睛之间 */}
        <ellipse cx="40" cy="62" rx="5" ry="3" fill="#FFAB91" opacity="0.5" />
        <ellipse cx="80" cy="62" rx="5" ry="3" fill="#FFAB91" opacity="0.5" />
        
        {/* 眼睛组 - 用于动画 */}
        <g className="eyes-group">
          {/* 眼睛（偏上，大间距） */}
          <ellipse className="left-eye" cx="48" cy="50" rx="6" ry="10" fill="#3A2F2F" />
          <ellipse className="right-eye" cx="72" cy="50" rx="6" ry="10" fill="#3A2F2F" />
          
          {/* 高光 - 固定居于眼睛内部上方 */}
          <circle className="eye-high left-high" cx="48" cy="46.5" r="2" fill="white" opacity="0.7" />
          <circle className="eye-high right-high" cx="72" cy="46.5" r="2" fill="white" opacity="0.7" />
        </g>
        
        {/* 小手组 - happy和nod状态时显示 */}
        <g className="hand-group">
          {/* 左手 */}
          <circle 
            className="hand hand-left" 
            cx="28" 
            cy="70" 
            r="6" 
            fill={colors.body}
            opacity="0"
          />
          {/* 右手 */}
          <circle 
            className="hand hand-right" 
            cx="92" 
            cy="70" 
            r="6" 
            fill={colors.body}
            opacity="0"
          />
        </g>
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

        /* 光晕层动画 - 复制自PC端 */
        .glow-layer {
          animation: glowPulse 3s ease-in-out infinite;
          transform-origin: 60px 60px;
        }

        @keyframes glowPulse {
          0%, 100% { 
            opacity: 0.8;
            transform: scale(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.05);
          }
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

        /* idle状态 - 眼睛到处看动画（复制自PC端） */
        .spirit-animate-idle .eyes-group {
          animation: eyeLookAround 8s ease-in-out infinite;
          transform-origin: 60px 50px;
        }

        @keyframes eyeLookAround {
          0%, 35% { transform: translate(0, 0); }
          40%, 45% { transform: translate(-4px, -3px); }
          50%, 75% { transform: translate(0, 0); }
          80%, 85% { transform: translate(4px, -3px); }
          90%, 100% { transform: translate(0, 0); }
        }

        /* idle状态 - 眨眼动画（复制自PC端） */
        .spirit-animate-idle .left-eye,
        .spirit-animate-idle .right-eye {
          transform-origin: center center;
        }

        .spirit-animate-idle .left-eye {
          animation: blink 4s infinite;
        }

        .spirit-animate-idle .right-eye {
          animation: blink 4.2s infinite;
        }

        @keyframes blink {
          0%, 48%, 52%, 100% { 
            transform: scaleY(1);
            opacity: 1;
          }
          50% { 
            transform: scaleY(0.05);
            opacity: 0.9;
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

        /* happy/nod 动画 */
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

        /* happy状态 - 左右轻微晃脑袋（覆盖基础动画） */
        .spirit-svg[data-state="happy"] {
          animation: headShake 2s ease-in-out infinite;
        }

        @keyframes headShake {
          0%, 100% { 
            transform: rotate(0deg);
          }
          25% { 
            transform: rotate(-3deg);
          }
          50% { 
            transform: rotate(0deg);
          }
          75% { 
            transform: rotate(3deg);
          }
        }

        /* happy状态 - 眼睛高光跑动 */
        .spirit-svg[data-state="happy"] .eye-high {
          animation: highlightRun 2s ease-in-out infinite;
        }

        @keyframes highlightRun {
          0% { 
            transform: translateX(0px) translateY(0px);
          }
          25% { 
            transform: translateX(1.5px) translateY(-1px);
          }
          50% { 
            transform: translateX(-1px) translateY(-0.5px);
          }
          75% { 
            transform: translateX(1px) translateY(0.5px);
          }
          100% { 
            transform: translateX(0px) translateY(0px);
          }
        }

        /* happy和nod状态 - 显示小手 */
        .spirit-svg[data-state="happy"] .hand-group,
        .spirit-svg[data-state="nod"] .hand-group {
          opacity: 1;
          transition: opacity 0.3s ease-in-out;
        }

        /* happy和nod状态 - 双手上下自然摆动（动作一致） */
        .spirit-svg[data-state="happy"] .hand-left,
        .spirit-svg[data-state="happy"] .hand-right,
        .spirit-svg[data-state="nod"] .hand-left,
        .spirit-svg[data-state="nod"] .hand-right {
          opacity: 1;
          animation: nodHands 1.2s ease-in-out infinite;
        }

        .spirit-svg[data-state="happy"] .hand-left,
        .spirit-svg[data-state="nod"] .hand-left {
          transform-origin: 28px 70px;
        }

        .spirit-svg[data-state="happy"] .hand-right,
        .spirit-svg[data-state="nod"] .hand-right {
          transform-origin: 92px 70px;
          animation-delay: 0.15s; /* 右手稍微延迟，形成自然的交替摆动 */
        }

        @keyframes nodHands {
          0%, 100% { 
            transform: translateY(0px);
          }
          50% { 
            transform: translateY(-3px);
          }
        }

        /* nod状态 - 头部点头动画（覆盖基础动画） */
        .spirit-svg[data-state="nod"] {
          animation: nodHeadTilt 1.2s ease-in-out infinite;
          transform-origin: 60px 92px; /* 头部底部中心 */
        }

        @keyframes nodHeadTilt {
          0%, 100% { 
            transform: rotate(4deg);
          }
          50% { 
            transform: rotate(10deg);
          }
        }

        /* nod状态 - 眼睛跟随头部点头 */
        .spirit-svg[data-state="nod"] .eyes-group {
          animation: nodBounce 1.2s ease-in-out infinite;
          transform-origin: 60px 92px;
        }

        @keyframes nodBounce {
          0%, 100% { 
            transform: rotate(0deg);
          }
          50% { 
            transform: rotate(6deg);
          }
        }
      `}</style>
    </>
  );
}

