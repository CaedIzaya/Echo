import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

const EchoSpirit = dynamic(() => import('./EchoSpirit'), { ssr: false });
const EchoSpiritMobile = dynamic(() => import('./EchoSpiritMobile'), { ssr: false });

export const GUIDE_STORAGE_KEY = 'hasCompletedNewUserGuide';

interface GuideStep {
  target: string | null;
  message: string;
  buttonText: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    target: null,
    message:
      '嗨，旅行者，我是Lumi，欢迎来到Echo，你可以在这里制定计划，并在安静的小空间里面沉浸心流状态，帮助你找回自己的节奏',
    buttonText: '下一步',
  },
  {
    target: 'plan-card',
    message:
      '这里是主界面，一个值得停歇的好地方，没有人会催促你，如果你想做些什么，这里是计划卡片，你可以随时在这里check小目标',
    buttonText: '下一步',
  },
  {
    target: 'quick-start',
    message: '需要一点力量推你一把的话，点击快速开始，立马进入专注计时',
    buttonText: '下一步',
  },
  {
    target: 'summary',
    message:
      '完成专注以后，可以在小结卡片里面写一份小结，你每一天的专注都会被看见，可以随时在星空日历里面回顾自己的每分每秒。\n\n好啦，介绍就到这里了，还有好多有趣的事情可以做呢！让我们开始吧！',
    buttonText: '开始吧！',
  },
];

interface NewUserGuideProps {
  onComplete: () => void;
}

function findVisibleGuideElement(name: string): Element | null {
  const elements = document.querySelectorAll(`[data-guide="${name}"]`);
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

export default function NewUserGuide({ onComplete }: NewUserGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [spiritAnimation, setSpiritAnimation] = useState<{
    token: number;
    type: 'happy' | 'nod' | 'excited';
    durationMs?: number;
  } | null>(null);
  const rafRef = useRef(0);

  const step = GUIDE_STEPS[currentStep]!;

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const updateTargetRect = useCallback(() => {
    if (!step.target) {
      setTargetRect(null);
      return;
    }
    const el = findVisibleGuideElement(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step.target]);

  useEffect(() => {
    const scrollTarget = step.target ? findVisibleGuideElement(step.target) : null;
    if (scrollTarget) {
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(updateTargetRect, 400);
    } else {
      updateTargetRect();
    }

    const onLayout = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateTargetRect);
    };
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
      cancelAnimationFrame(rafRef.current);
    };
  }, [step.target, updateTargetRect, currentStep]);

  useEffect(() => {
    const types: ('happy' | 'nod' | 'excited')[] = ['happy', 'nod', 'excited', 'happy'];
    setSpiritAnimation({ token: Date.now(), type: types[currentStep] ?? 'happy', durationMs: 1200 });
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    fetch('/api/user/complete-new-user-guide', { method: 'POST' }).catch(() => {});
    onComplete();
  }, [onComplete]);

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setIsAnimating(false);
      }, 280);
    } else {
      handleComplete();
    }
  };

  const PAD = isMobile ? 8 : 14;
  const RAD = isMobile ? 16 : 24;

  const spotlightStyle = targetRect
    ? {
        x: targetRect.left - PAD,
        y: targetRect.top - PAD,
        w: targetRect.width + PAD * 2,
        h: targetRect.height + PAD * 2,
      }
    : null;

  const dialogPos = getDialogPosition(targetRect, isMobile);

  return (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* SVG overlay with spotlight mask */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="guide-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotlightStyle && (
              <rect
                x={spotlightStyle.x}
                y={spotlightStyle.y}
                width={spotlightStyle.w}
                height={spotlightStyle.h}
                rx={RAD}
                ry={RAD}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#guide-mask)" />
      </svg>

      {/* Spotlight glow ring */}
      {spotlightStyle && (
        <div
          className="absolute rounded-3xl pointer-events-none transition-all duration-500 ease-out animate-guide-glow"
          style={{
            left: spotlightStyle.x,
            top: spotlightStyle.y,
            width: spotlightStyle.w,
            height: spotlightStyle.h,
            borderRadius: RAD,
          }}
        />
      )}

      {/* Click blocker */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Dialog container */}
      <div
        className={`absolute z-10 transition-all duration-300 ease-out ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
        style={dialogPos}
      >
        <div className={`flex items-end ${isMobile ? 'gap-2 max-w-[96vw]' : 'gap-3 max-w-md'}`}>
          {/* Lumi */}
          <div className="flex-shrink-0" style={{ width: isMobile ? 40 : 72, height: isMobile ? 40 : 72 }}>
            {isMobile ? (
              <EchoSpiritMobile
                state="idle"
                allowFocus={false}
                autoAnimation={spiritAnimation ?? undefined}
              />
            ) : (
              <EchoSpirit
                state="idle"
                disableAutoInteract
                autoAnimation={spiritAnimation ?? undefined}
              />
            )}
          </div>

          {/* Bubble */}
          <div className={`relative bg-white/95 backdrop-blur-xl shadow-2xl border border-teal-100/60 flex-1 ${isMobile ? 'rounded-xl p-3' : 'rounded-2xl p-5'}`}>
            {/* Tail arrow */}
            <div
              className={`absolute -left-2 bg-white/95 border-l border-b border-teal-100/60 rotate-45 ${isMobile ? 'bottom-3 w-3 h-3' : 'bottom-4 w-4 h-4'}`}
              style={{ backdropFilter: 'blur(16px)' }}
            />

            <p className={`text-zinc-700 whitespace-pre-line ${isMobile ? 'text-xs leading-snug' : 'text-sm leading-relaxed'}`}>{step.message}</p>

            <div className={`flex items-center justify-between gap-3 ${isMobile ? 'mt-2' : 'mt-4'}`}>
              {currentStep < GUIDE_STEPS.length - 1 ? (
                <button onClick={handleComplete} className="text-xs text-zinc-400 hover:text-zinc-600 transition">
                  跳过
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={handleNext}
                className={`rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:from-teal-600 hover:to-cyan-600 transition shadow-lg shadow-teal-500/30 active:scale-95 ${isMobile ? 'px-4 py-1.5 text-xs' : 'px-5 py-2 text-sm'}`}
              >
                {step.buttonText}
              </button>
            </div>

            {/* Step dots */}
            <div className={`flex justify-center gap-1.5 ${isMobile ? 'mt-1.5' : 'mt-3'}`}>
              {GUIDE_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep ? 'w-5 bg-teal-500' : i < currentStep ? 'w-1.5 bg-teal-300' : 'w-1.5 bg-zinc-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes guide-glow-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 2px rgba(94, 234, 212, 0.5), 0 0 24px rgba(94, 234, 212, 0.25);
          }
          50% {
            box-shadow: 0 0 0 3px rgba(94, 234, 212, 0.7), 0 0 36px rgba(94, 234, 212, 0.4);
          }
        }
        :global(.animate-guide-glow) {
          animation: guide-glow-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function getDialogPosition(targetRect: DOMRect | null, isMobile: boolean): React.CSSProperties {
  if (!targetRect) {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (isMobile) {
    const belowSpace = vh - targetRect.bottom;
    const aboveSpace = targetRect.top;

    if (belowSpace > 150) {
      return { left: 10, right: 10, top: targetRect.bottom + 12 };
    }
    if (aboveSpace > 150) {
      return { left: 10, right: 10, bottom: vh - targetRect.top + 12 };
    }
    return { left: 10, right: 10, bottom: 80 };
  }

  let top = targetRect.bottom + 24;
  let left = targetRect.left;

  if (top + 250 > vh) {
    top = Math.max(20, targetRect.top - 250);
  }
  if (left + 420 > vw) {
    left = vw - 440;
  }
  if (left < 20) left = 20;

  return { top, left };
}
