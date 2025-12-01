'use client';

import { useEffect, useRef, useState } from 'react';

interface EchoSpiritProps {
  state?: 'idle' | 'excited' | 'focus' | 'happy' | 'nod';
  className?: string;
  onStateChange?: (state: 'idle' | 'excited' | 'focus' | 'happy' | 'nod') => void;
  onClick?: () => void; // 点击回调
  allowFocus?: boolean; // 是否允许focus状态（主页应该设为false）
  isCompleted?: boolean; // 专注是否完成，决定颜色：false=idle颜色，true=completed颜色
}

export default function EchoSpirit({ state = 'idle', className = '', onStateChange, onClick, allowFocus = false, isCompleted = false }: EchoSpiritProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const leftEyeRef = useRef<SVGEllipseElement>(null);
  const rightEyeRef = useRef<SVGEllipseElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isUserControlledRef = useRef(false); // 标记是否由用户点击控制
  const isAnimatingRef = useRef(false); // 标记是否正在动画中（2s内不可打断）
  const [currentState, setCurrentState] = useState(state);

  // 同步外部state：如果用户没有主动控制，同步外部state
  // 注意：focus状态不应该在主页显示，如果外部传入focus或用户尝试设置focus，则强制转换为idle
  // excited现在不再是特殊状态，而是普通的交互动作
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
      setCurrentState(state);
      if (onStateChange) onStateChange(state);
    } else if (state === 'focus' && !allowFocus) {
      // 如果外部传入focus但不允许focus，强制转换为idle
      setCurrentState('idle');
      if (onStateChange) onStateChange('idle');
    }
  }, [state, onStateChange, currentState, allowFocus]);

  // 根据状态动态修改眼睛形状 - happy时让眼睛下半部分消失
  useEffect(() => {
    const leftEye = leftEyeRef.current;
    const rightEye = rightEyeRef.current;
    
    if (!leftEye || !rightEye) return;

    if (currentState === 'happy') {
      // happy状态：眼睛下半部分消失（使用clipPath裁剪）
      leftEye.setAttribute('clip-path', 'url(#eyeTopHalfClip)');
      rightEye.setAttribute('clip-path', 'url(#eyeTopHalfClip)');
    } else {
      // 其他状态：恢复正常
      leftEye.removeAttribute('clip-path');
      rightEye.removeAttribute('clip-path');
    }
  }, [currentState]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

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
        // 随机选择happy、nod或excited（excited现在是交互动作之一）
        const states: ('happy' | 'nod' | 'excited')[] = ['happy', 'nod', 'excited'];
        const nextState = states[Math.floor(Math.random() * states.length)];
        
        // 通知状态变化
        if (onStateChange) {
          onStateChange(nextState);
        }
        
        // 2秒后自动恢复到idle，并重置用户控制标记和动画标记
        timerRef.current = setTimeout(() => {
          // 恢复到idle状态
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

    wrap.addEventListener('click', handleClick);
    wrap.addEventListener('dblclick', handleDoubleClick);

    // 页面加载时添加intro-done类
    setTimeout(() => {
      wrap.classList.add('intro-done');
    }, 200);

    return () => {
      wrap.removeEventListener('click', handleClick);
      wrap.removeEventListener('dblclick', handleDoubleClick);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [onClick, onStateChange]);

  return (
    <>
      <div 
        ref={wrapRef}
        className={`echo-spirit-wrap ${className}`}
        role="img"
        aria-label="Echo 小精灵"
        data-state={currentState}
        data-completed={isCompleted ? 'true' : 'false'}
        tabIndex={0}
      >
        <svg className="echo-spirit" viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* ① idle状态 - 新的颜色方案 */}
            <radialGradient id="gHeadIdle" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#FFE7B0" />
              <stop offset="30%" stopColor="#FFD79A" />
              <stop offset="60%" stopColor="#FFD79A" />
              <stop offset="100%" stopColor="#FFC685" />
            </radialGradient>
            <radialGradient id="gHeadInnerIdle" cx="45%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#FFF6E4" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#FFDFAE" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            
            {/* ② completed/excited状态 - 与手机端一致的明亮黄色 */}
            <radialGradient id="gHeadCompleted" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#FFFBE3" />
              <stop offset="30%" stopColor="#FFE7A0" />
              <stop offset="60%" stopColor="#FFE7A0" />
              <stop offset="100%" stopColor="#FFD65C" />
            </radialGradient>
            <radialGradient id="gHeadInnerCompleted" cx="45%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#FFFBE3" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            
            {/* 默认渐变（向后兼容，使用新的idle颜色） */}
            <radialGradient id="gHead" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#FFE7B0" />
              <stop offset="30%" stopColor="#FFD79A" />
              <stop offset="60%" stopColor="#FFD79A" />
              <stop offset="100%" stopColor="#FFC685" />
            </radialGradient>
            <radialGradient id="gHeadInner" cx="45%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#FFF6E4" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#FFDFAE" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            {/* 阴影滤镜 - 根据不同状态 */}
            <filter id="softShadowIdle" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#FFC685" floodOpacity="0.25" />
            </filter>
            <filter id="softShadowFocus" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#8FA0FF" floodOpacity="0.2" />
            </filter>
            <filter id="softShadowCompleted" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#FFD65C" floodOpacity="0.3" />
            </filter>
            {/* 默认阴影（向后兼容，使用新的idle颜色） */}
            <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#FFC685" floodOpacity="0.25" />
            </filter>
            {/* 麻薯质感的内发光 */}
            <filter id="mochiGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* 光晕背景渐变 - 根据不同状态 */}
            {/* idle状态 - 新的柔光光晕 */}
            <radialGradient id="glowBgIdle" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#FFE8C6" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#FFC478" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#FFC478" stopOpacity="0.2" />
              <stop offset="85%" stopColor="#FFC478" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#FFC478" stopOpacity="0" />
            </radialGradient>
            {/* completed状态 - 与手机端一致的明亮光晕 */}
            <radialGradient id="glowBgCompleted" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#FFE7A0" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#FFE7A0" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#FFD65C" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#FFD65C" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#FFD65C" stopOpacity="0" />
            </radialGradient>
            {/* 默认光晕（向后兼容，使用新的idle颜色） */}
            <radialGradient id="glowBg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#FFE8C6" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#FFC478" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#FFC478" stopOpacity="0.2" />
              <stop offset="85%" stopColor="#FFC478" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#FFC478" stopOpacity="0" />
            </radialGradient>
            {/* 强光晕效果 */}
            <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="12" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* 光粒子渐变 */}
            <radialGradient id="particleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fff8e1" stopOpacity="0" />
            </radialGradient>
            {/* 外圈光晕渐变 - 新的柔光光晕效果 */}
            <radialGradient id="glowIdle" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFE8C6" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#FFC478" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FFC478" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glowCompleted" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFE7A0" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFD65C" stopOpacity="0" />
            </radialGradient>
            {/* 眼睛上3/5部分裁剪路径 - happy状态时只显示上3/5部分（让下2/5消失） */}
            <clipPath id="eyeTopHalfClip">
              <rect x="0" y="0" width="200" height="101" />
            </clipPath>
          </defs>
          {/* 外圈光晕 - 与手机端一致，微微的光晕效果 */}
          <circle 
            className="glow-outer glow-outer-idle" 
            cx="100" 
            cy="100" 
            r="62" 
            fill="url(#glowIdle)" 
            opacity="0"
          />
          <circle 
            className="glow-outer glow-outer-completed" 
            cx="100" 
            cy="100" 
            r="62" 
            fill="url(#glowCompleted)" 
            opacity="0"
          />
          {/* 光粒子效果 - 围绕小精灵旋转 */}
          <g className="particles-group" opacity="0">
            <circle className="particle particle-1" cx="100" cy="60" r="3" fill="url(#particleGlow)" />
            <circle className="particle particle-2" cx="140" cy="100" r="2.5" fill="url(#particleGlow)" />
            <circle className="particle particle-3" cx="100" cy="140" r="2" fill="url(#particleGlow)" />
            <circle className="particle particle-4" cx="60" cy="100" r="2.5" fill="url(#particleGlow)" />
            <circle className="particle particle-5" cx="120" cy="70" r="3" fill="url(#particleGlow)" />
            <circle className="particle particle-6" cx="80" cy="130" r="2" fill="url(#particleGlow)" />
          </g>
          {/* head with subtle stroke - 无边框，根据状态动态切换 */}
          <g className="head-wrap head-wrap-idle" filter="url(#softShadowIdle)">
            <circle className="head head-idle" cx="100" cy="100" r="44" fill="url(#gHeadIdle)" />
            <circle className="head-inner-glow head-inner-idle" cx="100" cy="100" r="44" fill="url(#gHeadInnerIdle)" />
          </g>
          <g className="head-wrap head-wrap-completed" filter="url(#softShadowCompleted)">
            <circle className="head head-completed" cx="100" cy="100" r="44" fill="url(#gHeadCompleted)" />
            <circle className="head-inner-glow head-inner-completed" cx="100" cy="100" r="44" fill="url(#gHeadInnerCompleted)" />
          </g>
          {/* 眼睛和装饰元素 - 在所有状态下共享 */}
          <g className="head-decoration-shared">
            {/* 更强的光泽高光 - 更亮更可爱 */}
            <ellipse 
              className="head-gloss" 
              cx="88" 
              cy="88" 
              rx="16" 
              ry="9" 
              fill="rgba(255,255,255,0.95)" 
              opacity="1" 
              transform="rotate(-20 88 88)"
            />
            {/* 额外的小高光点 */}
            <ellipse 
              className="head-gloss-small" 
              cx="92" 
              cy="84" 
              rx="7" 
              ry="5" 
              fill="rgba(255,255,255,0.9)" 
              opacity="0.95"
            />
          </g>
          {/* eyes group - 眼睛和高光一起移动 */}
          <g className="eyes-group">
            {/* left eye - 保持米粒形状（椭圆形） */}
            <g className="eye left-eye">
              <ellipse 
                ref={leftEyeRef}
                className="eye-sclera" 
                cx="84" 
                cy="98" 
                rx="8.6" 
                ry="13" 
                fill="#3a2b1a"
                style={{ transition: 'clip-path 0.3s ease-in-out' }}
              />
              {/* pupil highlight - 跟随眼睛移动 */}
              <ellipse className="eye-high left-high" cx="86" cy="90" rx="2.1" ry="3" fill="#ffffff" opacity="0.95" />
            </g>
            {/* right eye - 保持米粒形状（椭圆形） */}
            <g className="eye right-eye">
              <ellipse 
                ref={rightEyeRef}
                className="eye-sclera" 
                cx="116" 
                cy="98" 
                rx="8.6" 
                ry="13" 
                fill="#3a2b1a"
                style={{ transition: 'clip-path 0.3s ease-in-out' }}
              />
              {/* pupil highlight - 跟随眼睛移动 */}
              <ellipse className="eye-high right-high" cx="114" cy="90" rx="2.1" ry="3" fill="#ffffff" opacity="0.95" />
            </g>
          </g>
          {/* 小手 - happy和nod状态时显示，颜色与身体一致 */}
          <g className="hand-group">
            {/* 左手 - idle状态 */}
            <circle 
              className="hand hand-left hand-left-idle" 
              cx="56" 
              cy="140" 
              r="12" 
              fill="url(#gHeadIdle)" 
              opacity="0"
            />
            {/* 左手 - completed状态（excited/happy/nod） */}
            <circle 
              className="hand hand-left hand-left-completed" 
              cx="56" 
              cy="140" 
              r="12" 
              fill="url(#gHeadCompleted)" 
              opacity="0"
            />
            {/* 左手高光 */}
            <ellipse 
              className="hand-gloss hand-gloss-left" 
              cx="54" 
              cy="138" 
              rx="5" 
              ry="4" 
              fill="rgba(255,255,255,0.85)" 
              opacity="0"
            />
            {/* 右手 - idle状态 */}
            <circle 
              className="hand hand-right hand-right-idle" 
              cx="144" 
              cy="140" 
              r="12" 
              fill="url(#gHeadIdle)" 
              opacity="0"
            />
            {/* 右手 - completed状态（excited/happy/nod） */}
            <circle 
              className="hand hand-right hand-right-completed" 
              cx="144" 
              cy="140" 
              r="12" 
              fill="url(#gHeadCompleted)" 
              opacity="0"
            />
            {/* 右手高光 */}
            <ellipse 
              className="hand-gloss hand-gloss-right" 
              cx="146" 
              cy="138" 
              rx="5" 
              ry="4" 
              fill="rgba(255,255,255,0.85)" 
              opacity="0"
            />
          </g>
        </svg>
      </div>
      <style jsx>{`
        /* Container layout */
        .echo-spirit-wrap {
          display: inline-block;
          width: 160px;
          height: 160px;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          outline: none;
          position: relative;
        }

        /* SVG sizing */
        .echo-spirit {
          width: 100%;
          height: 100%;
          display: block;
          position: relative;
          z-index: 1;
        }
        
        /* 确保头部元素在所有设备上都能正确显示 */
        .head-wrap-idle,
        .head-wrap-completed {
          position: relative;
          z-index: 1;
        }
        
        /* 确保头部圆形元素可见 */
        .head-wrap-idle circle,
        .head-wrap-completed circle {
          display: block !important;
          visibility: inherit !important;
        }
        
        .eyes-group {
          position: relative;
          z-index: 2;
        }
        
        /* 手机端特殊处理 - 确保头部元素显示 */
        @media (max-width: 640px) {
          /* 专注未完成：所有状态使用idle颜色 */
          .echo-spirit-wrap[data-completed="false"][data-state="idle"] .head-wrap-idle,
          .echo-spirit-wrap[data-completed="false"][data-state="excited"] .head-wrap-idle,
          .echo-spirit-wrap[data-completed="false"][data-state="happy"] .head-wrap-idle,
          .echo-spirit-wrap[data-completed="false"][data-state="nod"] .head-wrap-idle {
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
          }
          
          /* 专注完成后：所有状态使用completed颜色 */
          .echo-spirit-wrap[data-completed="true"][data-state="idle"] .head-wrap-completed,
          .echo-spirit-wrap[data-completed="true"][data-state="excited"] .head-wrap-completed,
          .echo-spirit-wrap[data-completed="true"][data-state="happy"] .head-wrap-completed,
          .echo-spirit-wrap[data-completed="true"][data-state="nod"] .head-wrap-completed {
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
          }
        }

        /* Base animations */
        @keyframes floatY {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-6px) scale(1.015); }
          100% { transform: translateY(0px) scale(1); }
        }

        /* 光晕背景脉冲动画 */
        @keyframes glowPulse {
          0%, 100% { 
            opacity: 0.4;
            transform: scale(1);
          }
          50% { 
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        /* 光粒子旋转动画 - 围绕中心旋转 */
        @keyframes particleRotate {
          0% { transform: rotate(0deg) translateX(0px) translateY(0px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(0px) translateY(0px) rotate(-360deg); }
        }

        /* 光粒子闪烁动画 */
        @keyframes particleTwinkle {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        /* Q弹麻薯动画 - 弹性效果 */
        @keyframes mochiBounce {
          0%, 100% { 
            transform: scale(1) scaleY(1);
          }
          15% { 
            transform: scale(1.05) scaleY(0.95);
          }
          30% { 
            transform: scale(0.98) scaleY(1.02);
          }
          45% { 
            transform: scale(1.02) scaleY(0.98);
          }
          60% { 
            transform: scale(1) scaleY(1);
          }
        }

        /* 弹性变形动画 - 像果冻一样 */
        @keyframes elasticSquish {
          0%, 100% { 
            transform: scaleX(1) scaleY(1);
          }
          25% { 
            transform: scaleX(1.03) scaleY(0.97);
          }
          50% { 
            transform: scaleX(0.97) scaleY(1.03);
          }
          75% { 
            transform: scaleX(1.01) scaleY(0.99);
          }
        }

        /* excited状态 - 到处q弹乱晃 */
        @keyframes excitedBounce {
          0%, 100% { 
            transform: translateX(0px) translateY(0px) rotate(0deg) scale(1);
          }
          10% { 
            transform: translateX(-4px) translateY(-3px) rotate(-4deg) scale(1.04);
          }
          20% { 
            transform: translateX(3px) translateY(-2px) rotate(3deg) scale(0.98);
          }
          30% { 
            transform: translateX(-2px) translateY(2px) rotate(-2deg) scale(1.02);
          }
          40% { 
            transform: translateX(3px) translateY(-1px) rotate(3deg) scale(0.99);
          }
          50% { 
            transform: translateX(-2px) translateY(2px) rotate(-2deg) scale(1.03);
          }
          60% { 
            transform: translateX(2px) translateY(-1px) rotate(2deg) scale(0.98);
          }
          70% { 
            transform: translateX(-3px) translateY(1px) rotate(-3deg) scale(1.02);
          }
          80% { 
            transform: translateX(2px) translateY(-2px) rotate(2deg) scale(0.99);
          }
          90% { 
            transform: translateX(-1px) translateY(1px) rotate(-1deg) scale(1.01);
          }
        }


        @keyframes headBounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.03); }
          50% { transform: scale(0.98); }
          100% { transform: scale(1); }
        }

        /* 左上看动画 - 眼睛和高光一起移动（往左上看） */
        @keyframes lookLeftUp {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          50% { transform: translateX(-8px) translateY(-6px); }
        }

        @keyframes lookRight {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          50% { transform: translateX(8px) translateY(0px); }
        }

        /* 眼睛到处乱看动画 - excited状态 */
        @keyframes lookAround {
          0% { transform: translateX(0px) translateY(0px); }
          10% { transform: translateX(-4px) translateY(-3px); }
          20% { transform: translateX(4px) translateY(-2px); }
          30% { transform: translateX(-2px) translateY(2px); }
          40% { transform: translateX(3px) translateY(-1px); }
          50% { transform: translateX(-2px) translateY(2px); }
          60% { transform: translateX(3px) translateY(-1px); }
          70% { transform: translateX(-3px) translateY(1px); }
          80% { transform: translateX(2px) translateY(-2px); }
          90% { transform: translateX(-1px) translateY(1px); }
          100% { transform: translateX(0px) translateY(0px); }
        }

        /* 眼睛高光跑动动画 - happy状态 */
        @keyframes highlightRun {
          0% { transform: translateX(0px) translateY(0px); }
          25% { transform: translateX(3px) translateY(-2px); }
          50% { transform: translateX(-2px) translateY(-1px); }
          75% { transform: translateX(2px) translateY(1px); }
          100% { transform: translateX(0px) translateY(0px); }
        }

        /* 挥手动画 - happy状态 */
        @keyframes wave {
          0%, 100% { 
            transform: rotate(0deg) translateX(0px) translateY(0px);
          }
          25% { 
            transform: rotate(-25deg) translateX(-3px) translateY(-2px);
          }
          50% { 
            transform: rotate(0deg) translateX(0px) translateY(0px);
          }
          75% { 
            transform: rotate(25deg) translateX(3px) translateY(-2px);
          }
        }

        /* nod状态 - 头部向右撇并向下点头（球体旋转效果） */
        @keyframes nodHeadTilt {
          0%, 100% { 
            transform: rotate(8deg) rotate(0deg);
          }
          50% { 
            transform: rotate(8deg) rotate(12deg);
          }
        }

        /* nod状态 - 双手上下自然摆动 */
        @keyframes nodHands {
          0%, 100% { 
            transform: translateY(0px);
          }
          50% { 
            transform: translateY(-6px);
          }
        }

        /* nod状态 - 眼睛跟随头部向下点头（旋转效果） */
        @keyframes nodBounce {
          0%, 100% { 
            transform: rotate(0deg);
          }
          50% { 
            transform: rotate(12deg);
          }
        }

        /* 头部倾斜动画 - 向左倾斜看 */
        @keyframes headTilt {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          50% { transform: rotate(-5deg); }
          75% { transform: rotate(-8deg); }
        }

        /* 左右轻微晃脑袋动画 - happy状态 */
        @keyframes headShake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-6deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(6deg); }
        }

        /* 光效基础样式 */
        .glow-background {
          transform-origin: 100px 100px;
          transition: opacity 0.5s ease-in-out;
        }
        
        /* 外圈光晕基础样式 */
        .glow-outer {
          transform-origin: 100px 100px;
          transition: opacity 0.5s ease-in-out;
        }
        
        /* 根据状态显示/隐藏不同的头部和光晕 */
        .head-wrap-idle,
        .head-wrap-completed {
          opacity: 0 !important;
          pointer-events: none;
          visibility: hidden;
          /* 确保隐藏的元素不会在动画时露出 */
          position: absolute;
          transform: translateZ(0);
        }
        
        /* 外圈光晕 - 初始隐藏 */
        .glow-outer-idle,
        .glow-outer-completed {
          opacity: 0;
        }
        
        /* 专注未完成：所有状态使用idle颜色 */
        .echo-spirit-wrap[data-completed="false"][data-state="idle"] .head-wrap-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="idle"] .glow-outer-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="excited"] .head-wrap-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="excited"] .glow-outer-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="happy"] .head-wrap-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="happy"] .glow-outer-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="nod"] .head-wrap-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="nod"] .glow-outer-idle {
          opacity: 1 !important;
          pointer-events: auto;
          visibility: visible !important;
          position: relative;
        }
        
        /* 确保未完成状态下，completed形态完全隐藏 */
        .echo-spirit-wrap[data-completed="false"] .head-wrap-completed {
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          position: absolute;
          /* 确保不会在动画时显示，移除所有transform和animation */
          transform: none !important;
          animation: none !important;
          z-index: -1;
        }
        
        /* 确保未完成状态下，completed形态的子元素也不参与动画 */
        .echo-spirit-wrap[data-completed="false"] .head-wrap-completed * {
          animation: none !important;
          transform: none !important;
        }
        
        /* 专注完成后：所有状态使用completed颜色 */
        .echo-spirit-wrap[data-completed="true"][data-state="idle"] .head-wrap-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="idle"] .glow-outer-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="excited"] .head-wrap-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="excited"] .glow-outer-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="happy"] .head-wrap-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="happy"] .glow-outer-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="nod"] .head-wrap-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="nod"] .glow-outer-completed {
          opacity: 1 !important;
          pointer-events: auto;
          visibility: visible !important;
          position: relative;
        }
        
        /* 确保completed状态下，idle形态完全隐藏且不会在动画时露出 */
        .echo-spirit-wrap[data-completed="true"] .head-wrap-idle {
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          position: absolute;
          /* 确保不会在动画时显示，移除所有transform和animation */
          transform: none !important;
          animation: none !important;
          z-index: -1;
        }
        
        /* 确保completed状态下，idle形态的子元素也不参与动画 */
        .echo-spirit-wrap[data-completed="true"] .head-wrap-idle * {
          animation: none !important;
          transform: none !important;
        }
        
        .particles-group {
          transform-origin: 100px 100px;
          transition: opacity 0.5s ease-in-out;
        }

        .particle {
          transform-origin: 100px 100px;
        }

        /* idle state - 轻微光效，柔和暖光 */

        .echo-spirit-wrap[data-state="idle"] .particles-group {
          opacity: 0.4;
        }

        .echo-spirit-wrap[data-state="idle"] .particle-1 {
          animation: particleRotate 8s linear infinite, particleTwinkle 2s ease-in-out infinite;
        }

        .echo-spirit-wrap[data-state="idle"] .particle-2 {
          animation: particleRotate 10s linear infinite reverse, particleTwinkle 2.5s ease-in-out infinite;
          animation-delay: 0.3s;
        }

        .echo-spirit-wrap[data-state="idle"] .particle-3 {
          animation: particleRotate 12s linear infinite, particleTwinkle 3s ease-in-out infinite;
          animation-delay: 0.6s;
        }

        .echo-spirit-wrap[data-state="idle"] .particle-4 {
          animation: particleRotate 9s linear infinite reverse, particleTwinkle 2.2s ease-in-out infinite;
          animation-delay: 0.9s;
        }

        .echo-spirit-wrap[data-state="idle"] .particle-5 {
          animation: particleRotate 11s linear infinite, particleTwinkle 2.8s ease-in-out infinite;
          animation-delay: 1.2s;
        }

        .echo-spirit-wrap[data-state="idle"] .particle-6 {
          animation: particleRotate 13s linear infinite reverse, particleTwinkle 3.2s ease-in-out infinite;
          animation-delay: 1.5s;
        }

        .echo-spirit-wrap[data-state="idle"] .head-wrap-idle {
          transform-origin: 100px 100px;
          animation: floatY 3.8s ease-in-out infinite, headTilt 4s ease-in-out infinite, mochiBounce 4.5s ease-in-out infinite;
        }

        /* Q弹效果 - 头部弹性变形 */
        .echo-spirit-wrap[data-state="idle"] .head-idle {
          animation: elasticSquish 3.2s ease-in-out infinite;
          transform-origin: 100px 100px;
        }

        /* 左上看动画 - 眼睛和高光一起移动（往左上看） */
        .echo-spirit-wrap[data-state="idle"] .eyes-group {
          animation: lookLeftUp 5s ease-in-out infinite;
        }

        .echo-spirit-wrap[data-state="idle"] .left-eye,
        .echo-spirit-wrap[data-state="idle"] .right-eye {
          transform-origin: center;
        }

        .echo-spirit-wrap[data-state="idle"] .eye-high {
          transform-origin: center;
        }

        /* hover/interaction - 只向右看（简洁的交互） */
        /* idle状态下，hover时只让眼睛向右看，不改变头部位置 */
        .echo-spirit-wrap[data-state="idle"]:hover .eyes-group {
          animation: lookRight 0.6s ease-out forwards;
        }
        
        /* 其他状态下hover时不改变眼睛动画（保持当前状态动画） */
        .echo-spirit-wrap:not([data-state="idle"]):hover .eyes-group {
          /* 保持当前状态的动画，不覆盖 */
        }

        /* excited/completed state - 庆祝但不浮夸，明亮金光 */

        .echo-spirit-wrap[data-state="excited"] .particles-group {
          opacity: 1;
        }

        .echo-spirit-wrap[data-state="excited"] .particle-1 {
          animation: particleRotate 4s linear infinite, particleTwinkle 1s ease-in-out infinite;
        }

        .echo-spirit-wrap[data-state="excited"] .particle-2 {
          animation: particleRotate 5s linear infinite reverse, particleTwinkle 1.2s ease-in-out infinite;
          animation-delay: 0.2s;
        }

        .echo-spirit-wrap[data-state="excited"] .particle-3 {
          animation: particleRotate 6s linear infinite, particleTwinkle 1.1s ease-in-out infinite;
          animation-delay: 0.4s;
        }

        .echo-spirit-wrap[data-state="excited"] .particle-4 {
          animation: particleRotate 4.5s linear infinite reverse, particleTwinkle 1.3s ease-in-out infinite;
          animation-delay: 0.6s;
        }

        .echo-spirit-wrap[data-state="excited"] .particle-5 {
          animation: particleRotate 5.5s linear infinite, particleTwinkle 1.15s ease-in-out infinite;
          animation-delay: 0.8s;
        }

        .echo-spirit-wrap[data-state="excited"] .particle-6 {
          animation: particleRotate 6.5s linear infinite reverse, particleTwinkle 1.25s ease-in-out infinite;
          animation-delay: 1s;
        }

        /* excited状态 - 只作用于completed形态，确保idle形态不参与 */
        .echo-spirit-wrap[data-completed="true"][data-state="excited"] {
          animation: excitedBounce 2s ease-in-out infinite;
          transform-origin: center center;
        }

        .echo-spirit-wrap[data-completed="true"][data-state="excited"] .head-wrap-completed {
          animation: floatY 2s ease-in-out infinite, headTilt 2s ease-in-out infinite, mochiBounce 2s ease-in-out infinite;
          transform-origin: 100px 100px;
        }
        
        /* 未完成状态下的excited，使用idle形态 */
        .echo-spirit-wrap[data-completed="false"][data-state="excited"] {
          animation: excitedBounce 2s ease-in-out infinite;
          transform-origin: center center;
        }

        .echo-spirit-wrap[data-completed="false"][data-state="excited"] .head-wrap-idle {
          animation: floatY 2s ease-in-out infinite, headTilt 2s ease-in-out infinite, mochiBounce 2s ease-in-out infinite;
          transform-origin: 100px 100px;
        }

        .echo-spirit-wrap[data-completed="false"][data-state="excited"] .head-idle {
          transform-origin: 100px 100px;
          animation: headBounce 2s ease-in-out infinite, elasticSquish 2s ease-in-out infinite;
        }

        .echo-spirit-wrap[data-completed="true"][data-state="excited"] .head-completed {
          transform-origin: 100px 100px;
          animation: headBounce 2s ease-in-out infinite, elasticSquish 2s ease-in-out infinite;
        }

        /* excited状态 - 眼睛到处乱看 */
        .echo-spirit-wrap[data-state="excited"] .eyes-group {
          animation: lookAround 2s ease-in-out infinite;
        }


        /* focus/quiet state */


        /* happy state - 使用completed样式，左右轻微晃脑袋，眯眼睛（眼睛下半部分消失），保持q弹，中等光效 */

        .echo-spirit-wrap[data-state="happy"] .particles-group {
          opacity: 0.7;
        }

        .echo-spirit-wrap[data-state="happy"] .particle-1 {
          animation: particleRotate 6s linear infinite, particleTwinkle 1.5s ease-in-out infinite;
        }

        .echo-spirit-wrap[data-state="happy"] .particle-2 {
          animation: particleRotate 7s linear infinite reverse, particleTwinkle 1.6s ease-in-out infinite;
          animation-delay: 0.25s;
        }

        .echo-spirit-wrap[data-state="happy"] .particle-3 {
          animation: particleRotate 8s linear infinite, particleTwinkle 1.7s ease-in-out infinite;
          animation-delay: 0.5s;
        }

        .echo-spirit-wrap[data-state="happy"] .particle-4 {
          animation: particleRotate 6.5s linear infinite reverse, particleTwinkle 1.55s ease-in-out infinite;
          animation-delay: 0.75s;
        }

        .echo-spirit-wrap[data-state="happy"] .particle-5 {
          animation: particleRotate 7.5s linear infinite, particleTwinkle 1.65s ease-in-out infinite;
          animation-delay: 1s;
        }

        .echo-spirit-wrap[data-state="happy"] .particle-6 {
          animation: particleRotate 8.5s linear infinite reverse, particleTwinkle 1.75s ease-in-out infinite;
          animation-delay: 1.25s;
        }

        .echo-spirit-wrap[data-state="happy"] .head-wrap-completed {
          animation: headShake 2s ease-in-out infinite, mochiBounce 2s ease-in-out infinite;
          transform-origin: 100px 100px;
        }

        .echo-spirit-wrap[data-state="happy"] .head-completed {
          transform-origin: 100px 100px;
          animation: elasticSquish 2s ease-in-out infinite;
        }

        /* happy状态时眼睛不移动，保持原位置 */
        .echo-spirit-wrap[data-state="happy"] .eyes-group {
          animation: none;
        }

        /* 高光在高兴时跑动 */
        .echo-spirit-wrap[data-state="happy"] .eye-high {
          animation: highlightRun 2s ease-in-out infinite;
          transform-origin: center;
        }

        /* 手部基础样式 - 所有状态的手部初始隐藏 */
        .hand-left-idle,
        .hand-left-completed,
        .hand-right-idle,
        .hand-right-completed {
          opacity: 0;
        }

        /* 专注未完成：所有状态使用idle颜色的手部 */
        .echo-spirit-wrap[data-completed="false"][data-state="idle"] .hand-left-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="idle"] .hand-right-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="excited"] .hand-left-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="excited"] .hand-right-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="happy"] .hand-left-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="happy"] .hand-right-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="nod"] .hand-left-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="nod"] .hand-right-idle {
          opacity: 0; /* idle状态不显示手部，但happy/nod状态会显示 */
        }

        /* 专注完成后：所有状态使用completed颜色的手部（金色） */
        .echo-spirit-wrap[data-completed="true"][data-state="idle"] .hand-left-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="idle"] .hand-right-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="excited"] .hand-left-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="excited"] .hand-right-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="happy"] .hand-left-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="happy"] .hand-right-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="nod"] .hand-left-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="nod"] .hand-right-completed {
          opacity: 0; /* idle状态不显示手部，但happy/nod状态会显示 */
        }
        
        /* happy和nod状态显示手部（根据completed状态选择颜色） */
        .echo-spirit-wrap[data-completed="false"][data-state="happy"] .hand-left-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="happy"] .hand-right-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="nod"] .hand-left-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="nod"] .hand-right-idle,
        .echo-spirit-wrap[data-completed="true"][data-state="happy"] .hand-left-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="happy"] .hand-right-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="nod"] .hand-left-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="nod"] .hand-right-completed {
          opacity: 1;
        }

        /* happy状态时显示左手并挥手 */
        .echo-spirit-wrap[data-state="happy"] .hand-group {
          opacity: 1;
          transition: opacity 0.3s ease-in-out;
        }

        .echo-spirit-wrap[data-completed="false"][data-state="happy"] .hand-left-idle,
        .echo-spirit-wrap[data-completed="true"][data-state="happy"] .hand-left-completed {
          animation: wave 2s ease-in-out infinite;
          transform-origin: 56px 140px;
        }

        .echo-spirit-wrap[data-state="happy"] .hand-gloss-left {
          opacity: 1;
          animation: wave 2s ease-in-out infinite;
          transform-origin: 54px 138px;
        }

        .echo-spirit-wrap[data-completed="false"][data-state="happy"] .hand-right-idle,
        .echo-spirit-wrap[data-completed="true"][data-state="happy"] .hand-right-completed {
          opacity: 0;
        }

        .echo-spirit-wrap[data-state="happy"] .hand-gloss-right {
          opacity: 0;
        }

        /* nod状态 - 使用completed样式，头部向右撇并上下摆动，双手自然摆动 */

        .echo-spirit-wrap[data-state="nod"] .particles-group {
          opacity: 0.5;
        }

        .echo-spirit-wrap[data-state="nod"] .particle-1 {
          animation: particleRotate 7s linear infinite, particleTwinkle 1.8s ease-in-out infinite;
        }

        .echo-spirit-wrap[data-state="nod"] .particle-2 {
          animation: particleRotate 8s linear infinite reverse, particleTwinkle 1.9s ease-in-out infinite;
          animation-delay: 0.3s;
        }

        .echo-spirit-wrap[data-state="nod"] .particle-3 {
          animation: particleRotate 9s linear infinite, particleTwinkle 2s ease-in-out infinite;
          animation-delay: 0.6s;
        }

        .echo-spirit-wrap[data-state="nod"] .particle-4 {
          animation: particleRotate 7.5s linear infinite reverse, particleTwinkle 1.85s ease-in-out infinite;
          animation-delay: 0.9s;
        }

        .echo-spirit-wrap[data-state="nod"] .particle-5 {
          animation: particleRotate 8.5s linear infinite, particleTwinkle 1.95s ease-in-out infinite;
          animation-delay: 1.2s;
        }

        .echo-spirit-wrap[data-state="nod"] .particle-6 {
          animation: particleRotate 9.5s linear infinite reverse, particleTwinkle 2.05s ease-in-out infinite;
          animation-delay: 1.5s;
        }

        /* nod状态 - 头部向右撇并向下点头（球体旋转效果） */
        /* transform-origin 设置在头部底部中心，模拟球体向下旋转 */
        .echo-spirit-wrap[data-state="nod"] .head-wrap-completed {
          animation: nodHeadTilt 1.2s ease-in-out infinite;
          transform-origin: 100px 144px; /* 头部底部中心 */
        }

        .echo-spirit-wrap[data-state="nod"] .head-completed {
          transform-origin: 100px 144px; /* 头部底部中心 */
        }

        /* nod状态 - 眼睛跟随头部向下点头（旋转效果） */
        /* 眼睛和高光都在eyes-group内，会一起旋转 */
        .echo-spirit-wrap[data-state="nod"] .eyes-group {
          animation: nodBounce 1.2s ease-in-out infinite;
          transform-origin: 100px 144px; /* 与头部相同的旋转中心 */
        }
        
        /* nod状态 - 高光跟随眼睛组一起旋转，不需要单独动画 */
        .echo-spirit-wrap[data-state="nod"] .eye-high {
          animation: none; /* 移除单独动画，完全跟随eyes-group */
        }

        /* nod状态时显示双手并上下自然摆动 */
        .echo-spirit-wrap[data-state="nod"] .hand-group {
          opacity: 1;
          transition: opacity 0.3s ease-in-out;
        }

        .echo-spirit-wrap[data-completed="false"][data-state="nod"] .hand-left-idle,
        .echo-spirit-wrap[data-completed="false"][data-state="nod"] .hand-right-idle,
        .echo-spirit-wrap[data-completed="true"][data-state="nod"] .hand-left-completed,
        .echo-spirit-wrap[data-completed="true"][data-state="nod"] .hand-right-completed {
          opacity: 1;
          animation: nodHands 1.2s ease-in-out infinite;
        }

        .echo-spirit-wrap[data-completed="false"][data-state="nod"] .hand-left-idle,
        .echo-spirit-wrap[data-completed="true"][data-state="nod"] .hand-left-completed {
          transform-origin: 56px 140px;
        }

        .echo-spirit-wrap[data-completed="false"][data-state="nod"] .hand-right-idle,
        .echo-spirit-wrap[data-completed="true"][data-state="nod"] .hand-right-completed {
          transform-origin: 144px 140px;
          animation-delay: 0.15s; /* 右手稍微延迟，形成自然的交替摆动 */
        }

        .echo-spirit-wrap[data-state="nod"] .hand-gloss-left,
        .echo-spirit-wrap[data-state="nod"] .hand-gloss-right {
          opacity: 1;
          animation: nodHands 1.2s ease-in-out infinite;
        }

        .echo-spirit-wrap[data-state="nod"] .hand-gloss-left {
          transform-origin: 54px 138px;
        }

        .echo-spirit-wrap[data-state="nod"] .hand-gloss-right {
          transform-origin: 146px 138px;
          animation-delay: 0.15s;
        }

        /* 其他状态时隐藏小手 */
        .echo-spirit-wrap:not([data-state="happy"]):not([data-state="nod"]) .hand-group {
          opacity: 0;
          transition: opacity 0.3s ease-in-out;
        }

        /* accessibility: focus outline */
        .echo-spirit-wrap:focus {
          box-shadow: 0 0 0 6px rgba(255, 170, 80, 0.08);
          border-radius: 14px;
        }

        /* small responsive tweak */
        @media (max-width: 420px) {
          .echo-spirit-wrap {
            width: 120px;
            height: 120px;
          }
        }

        /* 🔥 终极修复：确保 idle 状态下头部永远显示（手机兼容） */
        .echo-spirit-wrap[data-state="idle"] .head-wrap-idle,
        .echo-spirit-wrap[data-state="idle"] .head-wrap-idle * {
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        }

        /* 🔥 SVG 渐变 fallback 修复：手机端不支持某些 filter/gradient 时强制纯色显示 */
        .head-idle {
          fill: url(#gHeadIdle), #FFDFAE !important;
        }
        
        .head-inner-idle {
          fill: url(#gHeadInnerIdle), #FFF6E4 !important;
        }
      `}</style>
    </>
  );
}

