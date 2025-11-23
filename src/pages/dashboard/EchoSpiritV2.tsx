'use client';

import { useEffect, useRef, useState } from 'react';

interface EchoSpiritProps {
  state?: 'idle' | 'excited' | 'focus' | 'happy' | 'nod';
  className?: string;
  onStateChange?: (state: 'idle' | 'excited' | 'focus' | 'happy' | 'nod') => void;
  onClick?: () => void;
  allowFocus?: boolean;
  isCompleted?: boolean; // false = idle 颜色, true = completed 金色
}

export default function EchoSpiritV2({
  state = 'idle',
  className = '',
  onStateChange,
  onClick,
  allowFocus = false,
  isCompleted = false,
}: EchoSpiritProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUserControlledRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const [currentState, setCurrentState] = useState<'idle' | 'excited' | 'focus' | 'happy' | 'nod'>(state);

  // 同步外部 state（保留 excited 优先逻辑）
  useEffect(() => {
    // focus 不允许时强制回 idle
    if (state === 'focus' && !allowFocus) {
      if (currentState !== 'idle') {
        setCurrentState('idle');
        onStateChange?.('idle');
      }
      return;
    }

    // excited 始终优先，由外部控制
    if (state === 'excited') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      isUserControlledRef.current = false;
      isAnimatingRef.current = false;
      setCurrentState('excited');
      onStateChange?.('excited');
      return;
    }

    // 如果当前由用户控制，则暂时不覆盖（等待用户交互结束）
    if (isUserControlledRef.current) return;

    // 正常同步
    if (state !== currentState) {
      setCurrentState(state);
      onStateChange?.(state);
    }
  }, [state, allowFocus, currentState, onStateChange]);

  // 自动眨眼逻辑（仅 idle / happy / nod / focus 时，excited 就让它乱看不眨）
  useEffect(() => {
    const scheduleBlink = () => {
      // 范围在 3~6 秒之间随机眨一次
      const delay = 3000 + Math.random() * 3000;
      blinkTimerRef.current = setTimeout(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        // 添加一个类触发 blink 动画
        wrap.classList.add('echo-blink');
        setTimeout(() => {
          wrap.classList.remove('echo-blink');
          scheduleBlink();
        }, 260); // blink 动画时长 ~260ms
      }, delay);
    };

    // excited 时眼睛已经很活跃，可以不加 blink
    if (currentState === 'excited') {
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current);
        blinkTimerRef.current = null;
      }
      return;
    }

    scheduleBlink();

    return () => {
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current);
        blinkTimerRef.current = null;
      }
    };
  }, [currentState]);

  // 点击与双击
  const handleClick = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    // 正在动画中（happy/nod 播放期）则忽略点击
    if (isAnimatingRef.current) {
      onClick?.();
      return;
    }

    // excited 状态由外部控制，不允许被打断
    if (currentState === 'excited') {
      onClick?.();
      return;
    }

    onClick?.();

    // 用户开始主动控制
    isUserControlledRef.current = true;
    isAnimatingRef.current = true;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setCurrentState((prev) => {
      if (prev === 'excited') return prev;
      const list: Array<'happy' | 'nod'> = ['happy', 'nod'];
      const next = list[Math.floor(Math.random() * list.length)];
      onStateChange?.(next);

      timerRef.current = setTimeout(() => {
        // 若外部已经切到 excited，则保持 excited
        if (state === 'excited') {
          setCurrentState('excited');
          onStateChange?.('excited');
        } else {
          setCurrentState('idle');
          onStateChange?.('idle');
        }
        isUserControlledRef.current = false;
        isAnimatingRef.current = false;
        timerRef.current = null;
      }, 2000);

      return next;
    });
  };

  const handleDoubleClick = () => {
    if (!allowFocus) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setCurrentState((prev) => {
      const next = prev === 'focus' ? 'idle' : 'focus';
      onStateChange?.(next);
      return next;
    });
  };

  // 初始入场小动画标记
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const t = setTimeout(() => {
      wrap.classList.add('intro-done');
    }, 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <div
        ref={wrapRef}
        className={`echo-spirit-v2-wrap ${className}`}
        role="img"
        aria-label="Echo 小光精灵 v2"
        data-state={currentState}
        data-completed={isCompleted ? 'true' : 'false'}
        tabIndex={0}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <svg
          className="echo-spirit-v2"
          viewBox="0 0 200 200"
          width="200"
          height="200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 身体渐变 - idle 柔和暖光 */}
            <radialGradient id="bodyIdle" cx="40%" cy="25%" r="70%">
              <stop offset="0%" stopColor="#FFF6E4" />
              <stop offset="30%" stopColor="#FFE1B0" />
              <stop offset="70%" stopColor="#FFC88A" />
              <stop offset="100%" stopColor="#F6A967" />
            </radialGradient>

            {/* 身体渐变 - completed / excited 金光 */}
            <radialGradient id="bodyCompleted" cx="40%" cy="25%" r="70%">
              <stop offset="0%" stopColor="#FFFBE7" />
              <stop offset="30%" stopColor="#FFECA8" />
              <stop offset="70%" stopColor="#FFD25C" />
              <stop offset="100%" stopColor="#FFB53C" />
            </radialGradient>

            {/* 头部内发光 */}
            <radialGradient id="bodyInner" cx="50%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#FFF3DD" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>

            {/* 外圈光晕 */}
            <radialGradient id="haloIdle" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#FFE7C6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#FFC478" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FFC478" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="haloCompleted" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#FFECA8" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#FFD25C" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFD25C" stopOpacity="0" />
            </radialGradient>

            {/* 眼睛笑眯 clipPath（显示上半部分） */}
            <clipPath id="eyeSmileClip">
              <rect x="0" y="0" width="200" height="98" />
            </clipPath>

            {/* 柔和投影 */}
            <filter id="softShadowV2" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor="#F0B57A" floodOpacity="0.3" />
            </filter>

            {/* 粒子光渐变 */}
            <radialGradient id="particleGlowV2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="100%" stopColor="#FFF2D2" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 外圈 halo */}
          <g className="halo-group">
            <circle
              className="halo halo-idle"
              cx="100"
              cy="108"
              r="64"
              fill="url(#haloIdle)"
            />
            <circle
              className="halo halo-completed"
              cx="100"
              cy="108"
              r="64"
              fill="url(#haloCompleted)"
            />
          </g>

          {/* 粒子 */}
          <g className="particle-group">
            <circle className="particle p1" cx="145" cy="68" r="3.3" fill="url(#particleGlowV2)" />
            <circle className="particle p2" cx="60" cy="74" r="2.6" fill="url(#particleGlowV2)" />
            <circle className="particle p3" cx="150" cy="125" r="2.4" fill="url(#particleGlowV2)" />
            <circle className="particle p4" cx="52" cy="125" r="2.0" fill="url(#particleGlowV2)" />
            <circle className="particle p5" cx="120" cy="52" r="2.8" fill="url(#particleGlowV2)" />
            <circle className="particle p6" cx="82" cy="150" r="2.3" fill="url(#particleGlowV2)" />
          </g>

          {/* 翅膀 */}
          <g className="wings-group" opacity="0.9">
            {/* 左翼 */}
            <path
              className="wing wing-left"
              d="M58 110 C38 100, 38 80, 60 70 C68 74, 72 82, 74 90 C72 100, 68 108, 58 110 Z"
              fill="rgba(255,255,255,0.65)"
            />
            {/* 右翼 */}
            <path
              className="wing wing-right"
              d="M142 110 C162 100, 162 80, 140 70 C132 74, 128 82, 126 90 C128 100, 132 108, 142 110 Z"
              fill="rgba(255,255,255,0.65)"
            />
          </g>

          {/* 身体（略微水滴形）：两个版本，通过 CSS 切颜色 */}
          <g className="body-group" filter="url(#softShadowV2)">
            <path
              className="body body-idle"
              d="M100  fiftyeight 
                 C80 60, 62 78, 60 100
                 C58 122, 70 142, 100 150
                 C130 142, 142 122, 140 100
                 C138 78, 120 60, 100 58 Z"
              fill="url(#bodyIdle)"
            />
            <path
              className="body body-completed"
              d="M100 58 
                 C80 60, 62 78, 60 100
                 C58 122, 70 142, 100 150
                 C130 142, 142 122, 140 100
                 C138 78, 120 60, 100 58 Z"
              fill="url(#bodyCompleted)"
            />
            {/* 内部柔光 */}
            <ellipse
              className="body-inner"
              cx="100"
              cy="96"
              rx="46"
              ry="40"
              fill="url(#bodyInner)"
            />
          </g>

          {/* 头顶小叶子 + 能量枝 */}
          <g className="top-deco">
            <path
              className="branch"
              d="M100 52 C100 42, 98 34, 96 28"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              className="leaf"
              d="M90 26 C86 25, 82 21, 82 17 C86 16, 90 16, 94 18 C96 21, 94 25, 90 26 Z"
              fill="#B6F2A7"
            />
          </g>

          {/* 高光 */}
          <g className="highlight-group">
            <ellipse
              className="head-gloss"
              cx="86"
              cy="84"
              rx="18"
              ry="10"
              fill="rgba(255,255,255,0.96)"
              transform="rotate(-18 86 84)"
            />
            <ellipse
              className="head-gloss-small"
              cx="94"
              cy="80"
              rx="7"
              ry="5"
              fill="rgba(255,255,255,0.96)"
            />
          </g>

          {/* 眼睛与嘴巴 */}
          <g className="face-group">
            {/* 眼睛组（用于整体跟随动画） */}
            <g className="eyes-group">
              {/* 左眼 */}
              <g className="eye eye-left">
                <ellipse
                  className="eye-sclera eye-sclera-left"
                  cx="84"
                  cy="100"
                  rx="8"
                  ry="13"
                  fill="#3A2B1A"
                />
                <ellipse
                  className="eye-highlight"
                  cx="86"
                  cy="92"
                  rx="2.1"
                  ry="3"
                  fill="#FFFFFF"
                />
              </g>
              {/* 右眼 */}
              <g className="eye eye-right">
                <ellipse
                  className="eye-sclera eye-sclera-right"
                  cx="116"
                  cy="100"
                  rx="8"
                  ry="13"
                  fill="#3A2B1A"
                />
                <ellipse
                  className="eye-highlight"
                  cx="114"
                  cy="92"
                  rx="2.1"
                  ry="3"
                  fill="#FFFFFF"
                />
              </g>
            </g>

            {/* 满足 happy 时用 clipPath 做成笑眯眼（通过 CSS 切换 clip-path） */}

            {/* 嘴：浅浅的温柔弧线 */}
            <path
              className="mouth"
              d="M86 116 C92 120, 108 120, 114 116"
              stroke="rgba(104,72,42,0.9)"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </svg>
      </div>

      <style jsx>{`
        .echo-spirit-v2-wrap {
          display: inline-block;
          width: 160px;
          height: 160px;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          outline: none;
          position: relative;
        }

        .echo-spirit-v2 {
          width: 100%;
          height: 100%;
          display: block;
        }

        @media (max-width: 420px) {
          .echo-spirit-v2-wrap {
            width: 120px;
            height: 120px;
          }
        }

        /* 状态驱动的基础可见性：idle / completed 颜色切换 */
        .body-idle,
        .halo-idle {
          opacity: 1;
        }
        .body-completed,
        .halo-completed {
          opacity: 0;
        }

        .echo-spirit-v2-wrap[data-completed='true'] .body-idle,
        .echo-spirit-v2-wrap[data-completed='true'] .halo-idle {
          opacity: 0;
        }
        .echo-spirit-v2-wrap[data-completed='true'] .body-completed,
        .echo-spirit-v2-wrap[data-completed='true'] .halo-completed {
          opacity: 1;
        }

        /* 粒子基础 */
        .particle-group {
          transform-origin: 100px 108px;
        }
        .particle {
          opacity: 0.0;
        }

        /* 翅膀基础 */
        .wings-group {
          transform-origin: 100px 104px;
        }
        .wing {
          transform-origin: center;
        }

        .body-group {
          transform-origin: 100px 108px;
        }
        .highlight-group,
        .face-group,
        .top-deco {
          transform-origin: 100px 98px;
        }

        /* 眨眼类：通过 scaleY 压扁眼睛 */
        .echo-spirit-v2-wrap.echo-blink .eye-sclera {
          animation: blinkOnce 0.26s ease-in-out;
          transform-origin: center;
        }

        @keyframes blinkOnce {
          0%,
          100% {
            transform: scaleY(1);
          }
          45%,
          55% {
            transform: scaleY(0.08);
          }
        }

        /* 通用浮动 + 呼吸 */
        @keyframes floatIdle {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        @keyframes breatheIdle {
          0%,
          100% {
            transform: scaleY(1) scaleX(1);
          }
          50% {
            transform: scaleY(0.97) scaleX(1.02);
          }
        }

        @keyframes haloPulse {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.06);
          }
        }

        @keyframes particleOrbitSlow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes particleOrbitFast {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(-360deg);
          }
        }

        @keyframes particleTwinkle {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }

        /* 翅膀 flap */
        @keyframes wingFlapSoft {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(5deg);
          }
        }

        @keyframes wingFlapStrongLeft {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(-14deg);
          }
        }

        @keyframes wingFlapStrongRight {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(14deg);
          }
        }

        /* q 弹果冻 */
        @keyframes jellyBounce {
          0%,
          100% {
            transform: scale(1, 1);
          }
          18% {
            transform: scale(1.08, 0.94);
          }
          36% {
            transform: scale(0.96, 1.05);
          }
          54% {
            transform: scale(1.03, 0.98);
          }
          72% {
            transform: scale(0.99, 1.02);
          }
        }

        /* excited 整体乱晃 */
        @keyframes excitedWiggle {
          0%,
          100% {
            transform: translate(0px, 0px) rotate(0deg);
          }
          14% {
            transform: translate(-3px, -4px) rotate(-4deg);
          }
          28% {
            transform: translate(3px, -2px) rotate(3deg);
          }
          42% {
            transform: translate(-2px, 3px) rotate(-2deg);
          }
          56% {
            transform: translate(3px, -1px) rotate(2deg);
          }
          70% {
            transform: translate(-3px, 2px) rotate(-3deg);
          }
          84% {
            transform: translate(2px, -2px) rotate(1deg);
          }
        }

        /* excited 眼睛四处乱看 */
        @keyframes lookAround {
          0% {
            transform: translate(0px, 0px);
          }
          20% {
            transform: translate(-4px, -4px);
          }
          40% {
            transform: translate(4px, -2px);
          }
          60% {
            transform: translate(3px, 3px);
          }
          80% {
            transform: translate(-2px, 2px);
          }
          100% {
            transform: translate(0px, 0px);
          }
        }

        /* happy 左右摇头 */
        @keyframes headShake {
          0%,
          100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-6deg);
          }
          50% {
            transform: rotate(0deg);
          }
          75% {
            transform: rotate(6deg);
          }
        }

        /* nod 点头 */
        @keyframes headNod {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(10deg);
          }
        }

        @keyframes nodHands {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        /* happy 眼睛高光小跑 */
        @keyframes highlightRun {
          0%,
          100% {
            transform: translate(0px, 0px);
          }
          50% {
            transform: translate(2px, -2px);
          }
        }

        /* ----- 各状态具体样式 ----- */

        /* idle：呼吸 + 轻浮动 + 柔光 + 沉稳翅膀 + 慢粒子 */
        .echo-spirit-v2-wrap[data-state='idle'] .body-group {
          animation: floatIdle 4.8s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='idle'] .body-idle,
        .echo-spirit-v2-wrap[data-state='idle'] .body-completed {
          animation: breatheIdle 4.2s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='idle'] .halo-idle,
        .echo-spirit-v2-wrap[data-state='idle'] .halo-completed {
          animation: haloPulse 5.8s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='idle'] .particle {
          opacity: 0.4;
          animation: particleOrbitSlow 16s linear infinite,
            particleTwinkle 3.2s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='idle'] .wings-group {
          animation: wingFlapSoft 3.4s ease-in-out infinite;
        }

        /* happy：轻微摇头 + 翅膀轻 flap + 眯眼 + 高光跑动 */
        .echo-spirit-v2-wrap[data-state='happy'] .body-group {
          animation: headShake 2.1s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='happy'] .body-idle,
        .echo-spirit-v2-wrap[data-state='happy'] .body-completed {
          animation: jellyBounce 2.2s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='happy'] .particle {
          opacity: 0.7;
          animation: particleOrbitSlow 12s linear infinite,
            particleTwinkle 2.2s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='happy'] .wings-group {
          animation: wingFlapSoft 1.8s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='happy'] .eye-highlight {
          animation: highlightRun 1.8s ease-in-out infinite;
          transform-origin: center;
        }
        /* happy 时做成笑眯眼效果：通过 scaleY+clip 模拟 */
        .echo-spirit-v2-wrap[data-state='happy'] .eye-sclera {
          transform-origin: center;
          transform: scaleY(0.55) translateY(3px);
        }

        /* excited：整体乱晃 + 强力 q 弹 + 强粒子 + 翅膀大幅扇动 + 眼睛乱看 */
        .echo-spirit-v2-wrap[data-state='excited'] {
          animation: excitedWiggle 2s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='excited'] .body-idle,
        .echo-spirit-v2-wrap[data-state='excited'] .body-completed {
          animation: jellyBounce 1.6s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='excited'] .particle {
          opacity: 1;
          animation: particleOrbitFast 8s linear infinite,
            particleTwinkle 1.4s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='excited'] .wings-group .wing-left {
          animation: wingFlapStrongLeft 0.65s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='excited'] .wings-group .wing-right {
          animation: wingFlapStrongRight 0.65s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='excited'] .eyes-group {
          animation: lookAround 1.6s ease-in-out infinite;
        }

        /* nod：点头 + 身体轻点 + 翅膀/叶子上下动（把它理解成认真回应你） */
        .echo-spirit-v2-wrap[data-state='nod'] .body-group {
          animation: headNod 1.3s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='nod'] .body-idle,
        .echo-spirit-v2-wrap[data-state='nod'] .body-completed {
          animation: jellyBounce 1.6s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='nod'] .wings-group {
          animation: nodHands 1.3s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='nod'] .top-deco {
          animation: nodHands 1.3s ease-in-out infinite;
          transform-origin: 96px 28px;
        }
        .echo-spirit-v2-wrap[data-state='nod'] .particle {
          opacity: 0.6;
          animation: particleOrbitSlow 14s linear infinite,
            particleTwinkle 2.6s ease-in-out infinite;
        }

        /* focus：更稳、更柔和；粒子慢，翅膀几乎不动 */
        .echo-spirit-v2-wrap[data-state='focus'] .body-group {
          animation: floatIdle 6s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='focus'] .body-idle,
        .echo-spirit-v2-wrap[data-state='focus'] .body-completed {
          animation: breatheIdle 6s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='focus'] .particle {
          opacity: 0.35;
          animation: particleOrbitSlow 20s linear infinite,
            particleTwinkle 4s ease-in-out infinite;
        }
        .echo-spirit-v2-wrap[data-state='focus'] .wings-group {
          animation: none;
        }

        /* 其他状态下粒子渐隐 */
        .echo-spirit-v2-wrap:not([data-state='idle'])
          :not([data-state='happy'])
          :not([data-state='excited'])
          :not([data-state='nod'])
          .particle {
          opacity: 0.3;
        }

        /* 获得焦点时的 outline */
        .echo-spirit-v2-wrap:focus {
          box-shadow: 0 0 0 6px rgba(255, 184, 104, 0.18);
          border-radius: 16px;
        }
      `}</style>
    </>
  );
}
