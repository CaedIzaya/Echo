'use client';

import { useEffect, useRef, useState } from 'react';

interface EchoSpiritProps {
  state?: 'idle' | 'excited' | 'focus' | 'happy' | 'nod';
  className?: string;
  onStateChange?: (state: string) => void;
  onClick?: () => void;
}

export default function EchoSpirit({ 
  state = 'idle', 
  className = '', 
  onStateChange, 
  onClick 
}: EchoSpiritProps) {
  const [currentState, setCurrentState] = useState(state);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external state
  useEffect(() => {
    if (!isAnimating) {
      setCurrentState(state);
    }
  }, [state, isAnimating]);

  // Interaction: Trigger animations based on state
  const handleInteract = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    if (onClick) onClick();
    
    // Randomly choose happy, nod, or excited (三个动作：摆头、点头、弹跳)
    const actions: ('happy' | 'nod' | 'excited')[] = ['happy', 'nod', 'excited'];
    const nextState = actions[Math.floor(Math.random() * actions.length)];
    setCurrentState(nextState);
    if (onStateChange) onStateChange(nextState);
    
    // Reset after animation
    timerRef.current = setTimeout(() => {
      setIsAnimating(false);
      setCurrentState('idle');
      if (onStateChange) onStateChange('idle');
    }, 2000);
  };

  return (
      <div 
        className={`echo-spirit-container ${className}`}
        onClick={handleInteract}
        role="button"
        tabIndex={0}
        data-state={currentState}
        data-animating={isAnimating}
      >
      <svg className="echo-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* 外圈光晕 - 增强可见度 */}
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD27F" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFB84D" stopOpacity="0" />
          </radialGradient>
          {/* 身体颜色 - 参考手机版 */}
          <radialGradient id="gradBodySoft" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE09A" />
            <stop offset="100%" stopColor="#FFD27F" />
          </radialGradient>
          {/* Eyes: 深棕色 */}
          <linearGradient id="gradEye" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3A2F2F" />
            <stop offset="100%" stopColor="#2A1F1F" />
          </linearGradient>
        </defs>
        
        {/* --- GROUP: MAIN ROTATOR (Handles Body Tilt) --- */}
        <g className="main-rotator" transform="translate(100, 100)">
          {/* 外圈光晕层 - 扩大半径确保可见，且位于底层 */}
          <circle cx="0" cy="0" r="110" fill="url(#glow)" className="glow-layer" />
          
          {/* --- LAYER 2: BODY (The Spirit) - 使用圆形建模，参考手机版 --- */}
          <g className="body-physics-group">
            {/* 身体圆形 - 参考手机版设计 */}
            <circle 
              className="body-shape"
              cx="0"
              cy="0"
              r="64"
              fill="url(#gradBodySoft)"
            />
            
            {/* 小手组 - 参考手机版，初始隐藏 */}
            <g className="hand-group">
              <circle 
                cx="-64" 
                cy="20" 
                r="12" 
                fill="url(#gradBodySoft)" 
                className="hand left-hand" 
                opacity="0"
              />
              <circle 
                cx="64" 
                cy="20" 
                r="12" 
                fill="url(#gradBodySoft)" 
                className="hand right-hand" 
                opacity="0"
              />
            </g>
            
            {/* 3.3 Face Container (Independent from body stretch) */}
            <g className="face-container" transform="translate(0, -10)">
              {/* 腮红 - 新增 */}
              <ellipse cx="-40" cy="15" rx="10" ry="6" fill="#FFAB91" opacity="0.5" />
              <ellipse cx="40" cy="15" rx="10" ry="6" fill="#FFAB91" opacity="0.5" />

              {/* EXPRESSIVE EYES GROUP - 参考手机版的眼睛设计 */}
              <g className="eyes-look-controller">
                {/* Left Eye - 参考手机版：偏上，大间距 */}
                <g className="eye-left" transform="translate(-24, -10)">
                  <ellipse cx="0" cy="0" rx="12" ry="20" fill="url(#gradEye)" />
                  {/* 高光 - 固定居于眼睛内部上方 */}
                  <circle cx="4" cy="-7" r="4" fill="white" opacity="0.7" className="eye-high left-high" />
                </g>
                {/* Right Eye */}
                <g className="eye-right" transform="translate(24, -10)">
                  <ellipse cx="0" cy="0" rx="12" ry="20" fill="url(#gradEye)" />
                  {/* 高光 */}
                  <circle cx="4" cy="-7" r="4" fill="white" opacity="0.7" className="eye-high right-high" />
                </g>
              </g>
            </g>
          </g>
        </g>
        
        {/* --- LAYER 4: MAGICAL PARTICLES --- */}
        <g className="particles">
           <circle className="p1" cx="140" cy="70" r="2" fill="#FFF" opacity="0.6" />
           <circle className="p2" cx="60" cy="160" r="1.5" fill="#FFF" opacity="0.4" />
           <circle className="p3" cx="150" cy="140" r="1" fill="#FFF" opacity="0.5" />
        </g>
      </svg>
      <style jsx>{`
        .echo-spirit-container {
          width: 110px;
          height: 110px;
          display: inline-block;
          cursor: pointer;
          position: relative;
          -webkit-tap-highlight-color: transparent;
        }
        
        .echo-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        
        /* 光晕层动画 - 参考手机版 */
        .glow-layer {
          animation: glowPulse 3s ease-in-out infinite;
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
        
        /* =========================================
           1. IDLE ANIMATIONS (Always Active)
           ========================================= */
        
        /* Body: Gentle floating sine wave - PC端保留 */
        @keyframes floatIdle {
          0%, 100% { transform: translateY(0px) rotate(-5deg) scale(1); }
          50% { transform: translateY(-8px) rotate(-3deg) scale(1.04); }
        }
        
        /* Eyes: Randomly looking around - PC端保留 */
        @keyframes eyeLookAround {
          0%, 35% { transform: translate(0, 0); } /* Center */
          40%, 45% { transform: translate(-8px, -6px); } /* Look Left Up - 参考手机版 */
          50%, 75% { transform: translate(0, 0); } /* Center */
          80%, 85% { transform: translate(8px, -6px); } /* Look Right Up */
          90%, 100% { transform: translate(0, 0); } /* Center */
        }
        
        /* Blink: Natural eye closing - PC端保留 */
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
        
        /* Particle Sparkle - PC端保留 */
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: translateY(0); }
          50% { opacity: 0.8; transform: translateY(-10px); }
        }
        
        /* --- APPLY IDLE --- */
        .echo-spirit-container[data-state="idle"] .main-rotator {
          animation: floatIdle 4s ease-in-out infinite;
          transform-origin: center center;
        }
        
        .echo-spirit-container[data-state="idle"] .eyes-look-controller {
          animation: eyeLookAround 8s ease-in-out infinite;
          transform-origin: 0px -10px; /* 相对于main-rotator的中心，眼睛在face-container的translate(0, -10)位置 */
        }
        
        /* Apply blink animation to both eyes independently - PC端保留 */
        .echo-spirit-container[data-state="idle"] .eye-left ellipse {
          transform-origin: 0px 0px;
          animation: blink 4s infinite;
        }
        .echo-spirit-container[data-state="idle"] .eye-right ellipse {
          transform-origin: 0px 0px;
          animation: blink 4.2s infinite;
        }
        
        .echo-spirit-container .p1 { animation: sparkle 3s infinite; }
        .echo-spirit-container .p2 { animation: sparkle 4s infinite 1s; }
        .echo-spirit-container .p3 { animation: sparkle 5s infinite 2s; }
        
        /* =========================================
           2. HAPPY ANIMATION (Wiggle & Bounce) - PC端保留
           ========================================= */
        @keyframes happyWiggle {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
          25% { transform: translateY(-5px) rotate(-3deg) scale(1.05); }
          50% { transform: translateY(-8px) rotate(0deg) scale(1.08); }
          75% { transform: translateY(-5px) rotate(3deg) scale(1.05); }
        }
        
        /* happy状态 - 左右轻微晃脑袋 - 参考手机版 */
        @keyframes headShake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(3deg); }
        }
        
        /* happy状态 - 眼睛高光跑动 - 参考手机版 */
        @keyframes highlightRun {
          0% { transform: translateX(0px) translateY(0px); }
          25% { transform: translateX(3px) translateY(-2px); }
          50% { transform: translateX(-2px) translateY(-1px); }
          75% { transform: translateX(2px) translateY(1px); }
          100% { transform: translateX(0px) translateY(0px); }
        }
        
        /* happy和nod状态 - 显示小手并上下摆动 - 参考手机版 */
        @keyframes nodHands {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        
        /* nod状态 - 头部点头动画（覆盖基础动画） - 参考手机版 */
        @keyframes nodHeadTilt {
          0%, 100% { transform: rotate(4deg); }
          50% { transform: rotate(10deg); }
        }
        
        /* nod状态 - 眼睛跟随头部点头 - 参考手机版 */
        @keyframes nodBounce {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(6deg); }
        }
        
        /* happy状态 - 组合动画：headShake和happyWiggle都应用在main-rotator上，避免容器位移 */
        .echo-spirit-container[data-state="happy"] .main-rotator {
          animation: happyWiggle 0.6s ease-in-out infinite, headShake 2s ease-in-out infinite;
          transform-origin: center center;
        }
        
        .echo-spirit-container[data-state="happy"] .eyes-look-controller {
          animation: none;
        }
        
        .echo-spirit-container[data-state="happy"] .eye-high {
          animation: highlightRun 2s ease-in-out infinite;
        }
        
        .echo-spirit-container[data-state="happy"] .hand-group {
          opacity: 1;
          transition: opacity 0.3s ease-in-out;
        }
        
        .echo-spirit-container[data-state="happy"] .hand-left,
        .echo-spirit-container[data-state="happy"] .hand-right {
          opacity: 1;
          animation: nodHands 1.2s ease-in-out infinite;
        }
        
        .echo-spirit-container[data-state="happy"] .hand-right {
          animation-delay: 0.15s;
        }
        
        /* nod状态 - 头部点头 - 参考手机版，应用在main-rotator上避免容器位移 */
        .echo-spirit-container[data-state="nod"] .main-rotator {
          animation: nodHeadTilt 1.2s ease-in-out infinite;
          transform-origin: center bottom; /* 头部底部中心 */
        }
        
        .echo-spirit-container[data-state="nod"] .eyes-look-controller {
          animation: nodBounce 1.2s ease-in-out infinite;
          transform-origin: center center;
        }
        
        .echo-spirit-container[data-state="nod"] .hand-group {
          opacity: 1;
          transition: opacity 0.3s ease-in-out;
        }
        
        .echo-spirit-container[data-state="nod"] .hand-left,
        .echo-spirit-container[data-state="nod"] .hand-right {
          opacity: 1;
          animation: nodHands 1.2s ease-in-out infinite;
        }
        
        .echo-spirit-container[data-state="nod"] .hand-right {
          animation-delay: 0.15s;
        }
        
        /* =========================================
           3. EXCITED ANIMATION (Bounce & Dart) - PC端保留
           ========================================= */
        @keyframes excitedBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          20% { transform: translateY(8px) scale(1.1, 0.9); } /* Squash down */
          40% { transform: translateY(-15px) scale(0.9, 1.1) rotate(5deg); } /* Jump up */
          60% { transform: translateY(-12px) scale(0.95, 1.05) rotate(-3deg); }
          80% { transform: translateY(5px) scale(1.05, 0.95); } /* Land */
        }
        
        .echo-spirit-container[data-state="excited"] .main-rotator {
          animation: excitedBounce 0.8s ease-in-out infinite;
          transform-origin: center center;
        }
        
        .echo-spirit-container[data-state="excited"] .eyes-look-controller {
          animation: none;
        }
        
        .echo-spirit-container[data-state="excited"] .hand-group {
          opacity: 1;
          transition: opacity 0.3s ease-in-out;
        }
        
        .echo-spirit-container[data-state="excited"] .hand-left,
        .echo-spirit-container[data-state="excited"] .hand-right {
          opacity: 1;
          animation: nodHands 0.8s ease-in-out infinite;
        }
        
        .echo-spirit-container[data-state="excited"] .hand-right {
          animation-delay: 0.1s;
        }
      `}</style>
    </div>
  );
}
