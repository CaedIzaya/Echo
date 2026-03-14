import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import EchoSpirit from './dashboard/EchoSpirit';
import SplashLoader from '~/components/SplashLoader';
import { setCurrentUserId } from '~/lib/userStorage';
import { useScrollReveal } from '~/hooks/useScrollReveal';
import { useInstallPrompt } from '~/hooks/useInstallPrompt';
import { trackEvent } from '~/lib/analytics';
import {
  LOADING_STEPS,
  LANDING_FEATURES,
  HERO_PLAN_TASKS,
  ECHO_PRINCIPLES,
  PAIN_POINTS,
  HOW_IT_WORKS,
  RANDOM_SPIRIT_MESSAGES,
} from '~/constants/landing';

/* ─── Reveal wrapper (avoids calling hook inside .map) ─── */
const RevealDiv = ({ variant = 'fadeUp' as const, delay = 0, className = '', children }: {
  variant?: 'fadeUp' | 'fadeIn' | 'scaleIn' | 'fadeLeft' | 'fadeRight';
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) => {
  const ref = useScrollReveal<HTMLDivElement>({ variant, delay });
  return <div ref={ref} className={className}>{children}</div>;
};

/* ─── Pain-point rotator (replaces old 3-card grid) ─── */
const PainPointRotator = () => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let fade: NodeJS.Timeout | null = null;
    const interval = setInterval(() => {
      setVisible(false);
      fade = setTimeout(() => {
        setIndex((i) => (i + 1) % PAIN_POINTS.length);
        setVisible(true);
      }, 350);
    }, 3200);
    return () => {
      clearInterval(interval);
      if (fade) clearTimeout(fade);
    };
  }, []);

  return (
    <p
      className={`text-base md:text-lg text-slate-500 transition-all duration-500 h-7 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      }`}
    >
      {PAIN_POINTS[index]}
    </p>
  );
};

/* ─── Animated counter (for social proof) ─── */
const AnimatedCounter = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1600;
          const steps = 40;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

/* ─── Navbar ─── */
const LandingNavbar = ({
  onPrimaryAction,
  onSecondaryAction,
}: {
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
    document.body.style.overflow = '';
  }, [isMenuOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? 'bg-white/80 backdrop-blur-lg shadow-sm py-4' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-500 text-white rounded-2xl p-1.5 shadow-lg shadow-cyan-500/40 flex items-center justify-center overflow-hidden w-11 h-11">
            <img src="/Echo Icon.png" alt="Echo" className="w-full h-full object-cover scale-150" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Echo</p>
            <p className="text-xl font-bold text-slate-900">回心</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-teal-600 transition-colors">功能</a>
          <a href="#how-it-works" className="hover:text-teal-600 transition-colors">流程</a>
          <a href="#mission" className="hover:text-teal-600 transition-colors">理念</a>
          <button onClick={onSecondaryAction} className="px-5 py-2 rounded-full text-teal-600 font-semibold hover:bg-teal-50 transition-colors">
            登录
          </button>
          <button onClick={onPrimaryAction} className="px-6 py-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold transition-all shadow-lg hover:shadow-emerald-400/40">
            免费注册
          </button>
        </div>

        <button className="md:hidden text-slate-600" aria-label="切换菜单" onClick={() => setIsMenuOpen((p) => !p)}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            {isMenuOpen ? (
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <>
                <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden mx-4 mt-4 rounded-2xl p-5 space-y-4 bg-white/95 backdrop-blur-xl shadow-xl border border-white/60 landing-menu-enter">
          <a href="#features" className="block text-base font-medium text-slate-700" onClick={() => setIsMenuOpen(false)}>功能</a>
          <a href="#how-it-works" className="block text-base font-medium text-slate-700" onClick={() => setIsMenuOpen(false)}>流程</a>
          <a href="#mission" className="block text-base font-medium text-slate-700" onClick={() => setIsMenuOpen(false)}>理念</a>
          <button onClick={() => { onSecondaryAction(); setIsMenuOpen(false); }} className="w-full py-3 rounded-xl bg-teal-50 text-teal-600 font-semibold">登录</button>
          <button onClick={() => { onPrimaryAction(); setIsMenuOpen(false); }} className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold shadow-md">免费注册</button>
        </div>
      )}
    </nav>
  );
};

/* ─── Hero (simplified) ─── */
const LandingHero = ({
  onPrimaryAction,
}: {
  onPrimaryAction: () => void;
}) => {
  const titleRef = useScrollReveal<HTMLDivElement>({ variant: 'fadeUp', delay: 0 });
  const cardRef = useScrollReveal<HTMLDivElement>({ variant: 'scaleIn', delay: 200 });

  return (
    <section className="relative min-h-screen pt-32 md:pt-44 pb-16 overflow-hidden" id="hero">
      {/* Floating orbs */}
      <div className="absolute top-16 right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-radial from-emerald-200/50 via-teal-100/30 to-transparent blur-3xl landing-orb-float" />
      <div className="absolute bottom-0 left-[-8%] w-[420px] h-[420px] rounded-full bg-gradient-radial from-cyan-200/50 via-sky-100/30 to-transparent blur-3xl landing-orb-float-reverse" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Text */}
        <div ref={titleRef} className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-teal-100/70 shadow-sm backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500" />
            </span>
            <span className="text-sm font-medium text-teal-700">Echo · 回心</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-slate-900 leading-[1.12] tracking-tight">
            从最小开始，
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400">
              找回节奏
            </span>
          </h1>

          <PainPointRotator />

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <button
              onClick={onPrimaryAction}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-400 rounded-full shadow-[0_20px_45px_-15px_rgba(14,165,233,0.5)] hover:shadow-[0_28px_55px_-18px_rgba(14,165,233,0.7)] transition-all hover:-translate-y-0.5"
            >
              开始使用
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-slate-600 rounded-full border border-slate-200 hover:border-teal-300 hover:text-teal-600 transition-all"
            >
              了解更多
            </a>
          </div>
        </div>

        {/* Simplified preview card — visible on mobile too */}
        <div ref={cardRef} className="mt-12 md:mt-16 max-w-sm mx-auto">
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/80 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">投资自己</h3>
                <p className="text-xs text-slate-500 mt-0.5">按节奏投入热爱的事</p>
              </div>
              <span className="px-2.5 py-1 bg-teal-50 text-teal-600 text-xs font-semibold rounded-full">进行中</span>
            </div>

            <div className="space-y-2.5">
              {HERO_PLAN_TASKS.map((task) => (
                <div
                  key={task.title}
                  className={`flex items-center gap-3 p-3 rounded-2xl border ${
                    task.done ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-100 bg-white/60'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      task.done ? 'bg-emerald-500 text-white' : 'bg-slate-100'
                    }`}
                  >
                    {task.done ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="block w-1.5 h-1.5 rounded-full bg-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.title}</p>
                    <p className="text-xs text-slate-400">{task.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtle progress bar */}
            <div className="mt-5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full w-[33%] rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Social Proof ─── */
const SocialProof = () => {
  const [stats, setStats] = useState({ users: 0, sessions: 0, totalHours: 0 });
  const ref = useScrollReveal<HTMLDivElement>({ variant: 'fadeUp' });

  useEffect(() => {
    fetch('/api/landing-stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  const items = [
    { label: '位旅行者', value: stats.users },
    { label: '次专注', value: stats.sessions },
    { label: '小时沉浸', value: stats.totalHours },
  ];

  if (stats.users === 0 && stats.sessions === 0) return null;

  return (
    <section className="py-14 relative">
      <div ref={ref} className="max-w-4xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-slate-900">
                <AnimatedCounter target={item.value} />
              </p>
              <p className="text-sm text-slate-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Feature Grid ─── */
const FeatureGrid = () => {
  const titleRef = useScrollReveal<HTMLDivElement>({ variant: 'fadeUp' });

  return (
    <section id="features" className="py-20 relative">
      {/* Soft transition gradient at top */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#fafcfb] to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        <div ref={titleRef} className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-teal-600 font-semibold tracking-wider uppercase text-sm bg-teal-50 px-4 py-1.5 rounded-full">
            核心功能
          </span>
          <h2 className="mt-6 text-3xl md:text-4xl font-bold text-slate-900">你的赛博避难所</h2>
          <p className="mt-4 text-lg text-slate-500">
            做自己感兴趣的事情，在这里没有考核，没有压力，没有打扰。
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {LANDING_FEATURES.map((feature, i) => (
            <RevealDiv
              key={feature.title}
              variant="fadeUp"
              delay={i * 120}
              className={`group relative p-8 rounded-[2rem] border bg-gradient-to-br ${feature.accent} shadow-sm hover:shadow-lg transition-all duration-500 hover:-translate-y-1`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center text-2xl shadow-lg mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                {feature.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-3 text-xl">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.description}</p>
            </RevealDiv>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── How It Works ─── */
const HowItWorks = () => {
  const titleRef = useScrollReveal<HTMLDivElement>({ variant: 'fadeUp' });

  return (
    <section id="how-it-works" className="py-20 relative">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-[#fafcfb]/80 to-transparent pointer-events-none" />
      <div className="max-w-5xl mx-auto px-6">
        <div ref={titleRef} className="text-center mb-14">
          <span className="text-emerald-600 font-semibold tracking-wider uppercase text-sm bg-emerald-50 px-4 py-1.5 rounded-full">
            快速开始
          </span>
          <h2 className="mt-6 text-3xl md:text-4xl font-bold text-slate-900">三步进入专注</h2>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="hidden md:grid md:grid-cols-3 gap-8 relative">
          {/* Connecting dashed line */}
          <div className="absolute top-10 left-[16.7%] right-[16.7%] h-px border-t-2 border-dashed border-slate-200 z-0" />

          {HOW_IT_WORKS.map((step, i) => (
            <RevealDiv key={step.step} variant="fadeUp" delay={i * 150} className="relative text-center z-10">
              <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${step.color} text-white flex items-center justify-center text-2xl font-bold shadow-lg mb-5`}>
                {step.step}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500">{step.description}</p>
            </RevealDiv>
          ))}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="md:hidden space-y-8 relative pl-12">
          <div className="absolute left-5 top-3 bottom-3 w-px border-l-2 border-dashed border-slate-200" />
          {HOW_IT_WORKS.map((step, i) => (
            <RevealDiv key={step.step} variant="fadeLeft" delay={i * 120} className="relative">
              <div className={`absolute -left-12 top-0 w-10 h-10 rounded-full bg-gradient-to-br ${step.color} text-white flex items-center justify-center text-sm font-bold shadow-md`}>
                {step.step}
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{step.title}</h3>
              <p className="text-sm text-slate-500">{step.description}</p>
            </RevealDiv>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Motivation / Principles ─── */
const MotivationSection = () => {
  const titleRef = useScrollReveal<HTMLDivElement>({ variant: 'fadeUp' });

  return (
    <section id="mission" className="py-20 relative">
      <div className="max-w-5xl mx-auto px-6">
        <div ref={titleRef} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-100/70 text-sm font-semibold text-emerald-700 mb-4">
            Echo 的绝对规则
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">我们绝不</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            这是 Echo 的绝对规则和宪法，也是我们唯一束缚的事情
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {ECHO_PRINCIPLES.map((p, i) => (
            <RevealDiv
              key={i}
              variant="fadeUp"
              delay={i * 100}
              className={`rounded-2xl bg-white border-l-4 ${p.color} p-7 shadow-sm hover:shadow-md transition-all duration-300`}
            >
              <div className="text-3xl mb-3">{p.emoji}</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{p.title}</h3>
              <p className="text-slate-600 leading-relaxed text-sm">{p.description}</p>
            </RevealDiv>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Install Section ─── */
const InstallSection = () => {
  const ref = useScrollReveal<HTMLDivElement>({ variant: 'fadeUp' });
  const { state: installState, install } = useInstallPrompt();
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  const canInstallDirectly = installState === 'available';

  return (
    <section className="py-16 relative">
      <div ref={ref} className="max-w-3xl mx-auto px-6">
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-sm text-teal-300 font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              可安装，不到 1 MB
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-white">
              安装桌面 App，打开即专注
            </h3>
            <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">
              没有地址栏，没有标签页干扰，独立窗口沉浸专注。
              <br className="hidden md:block" />
              Echo 本身就是 Web App，<span className="text-teal-300">不安装也能正常使用</span>——安装只是多一条更快进入专注的路径。
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              {canInstallDirectly ? (
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-900 font-bold rounded-full shadow-[0_20px_45px_-15px_rgba(14,165,233,0.5)] hover:shadow-[0_28px_55px_-18px_rgba(14,165,233,0.7)] transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {installing ? '安装中...' : '一键安装桌面 App'}
                </button>
              ) : installState === 'installed' ? (
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 text-teal-300 font-medium">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  已安装
                </div>
              ) : installState === 'ios' ? (
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">
                    在 Safari 中点底部
                    <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-white/10 rounded text-xs text-teal-300">分享</span>
                    → 「添加到主屏幕」
                  </p>
                </div>
              ) : (
                <a
                  href="/auth/signin"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-full shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  登录后安装
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── CTA ─── */
const LandingCTA = ({ onPrimaryAction }: { onPrimaryAction: (email?: string) => void }) => {
  const [email, setEmail] = useState('');
  const ref = useScrollReveal<HTMLDivElement>({ variant: 'scaleIn' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent({ name: 'landing_email_submit', feature: 'landing', page: '/', action: 'submit' });
    trackEvent({ name: 'landing_cta_click', feature: 'landing', page: '/', action: 'click', properties: { position: 'bottom' } });
    onPrimaryAction(email.trim() || undefined);
  };

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-br from-[#022b2f] via-[#044345] to-[#056060]">
      {/* CSS gradient texture (no external dependency) */}
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Floating glow orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-72 h-72 bg-emerald-500 rounded-full blur-[160px] opacity-25 landing-orb-float" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-cyan-400 rounded-full blur-[200px] opacity-25 landing-orb-float-reverse" />

      <div ref={ref} className="relative max-w-4xl mx-auto px-6 text-center text-white">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight">
          准备好开始这段
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-emerald-200 to-cyan-100">
            专注之旅了吗？
          </span>
        </h2>
        <p className="text-lg md:text-xl text-emerald-100/80 mb-10">
          在无序的噪音里选择 Echo，选择倾听内心的声音。
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="输入你的邮箱地址..."
            className="w-full sm:w-80 px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder-emerald-200/60 focus:outline-none focus:ring-2 focus:ring-teal-300/60 backdrop-blur-sm transition-all focus:bg-white/15 focus:scale-[1.02]"
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 text-slate-900 font-bold rounded-full hover:shadow-[0_25px_50px_-25px_rgba(16,185,129,0.8)] transition-all hover:-translate-y-0.5 active:scale-95"
          >
            即刻开始
          </button>
        </form>
        <p className="mt-5 text-sm text-emerald-100/50">完全免费，无需信用卡</p>
      </div>
    </section>
  );
};

/* ─── Footer ─── */
const LandingFooter = () => {
  const ref = useScrollReveal<HTMLDivElement>({ variant: 'fadeUp' });

  return (
    <footer className="bg-[#fafcfb] border-t border-slate-200/70 pt-16 pb-8">
      <div ref={ref} className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-br from-teal-500 to-cyan-500 text-white p-1.5 rounded-xl flex items-center justify-center overflow-hidden w-10 h-10">
                <img src="/Echo Icon.png" alt="Echo" className="w-full h-full object-cover scale-150" />
              </div>
              <span className="text-xl font-bold text-slate-900">Echo</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              在嘈杂的世界里，选择倾听内心的声音
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 text-sm">产品</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="#features" className="hover:text-teal-600 transition-colors">功能概览</a></li>
              <li><a href="#how-it-works" className="hover:text-teal-600 transition-colors">快速开始</a></li>
              <li><a href="#mission" className="hover:text-teal-600 transition-colors">我们的理念</a></li>
            </ul>
          </div>

          {/* Follow */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 text-sm">关注我们</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>
                <a href="https://www.xiaohongshu.com/user/profile/67419bc3000000001d02c327?xsec_token=ABOSRA4q1KRUWPK8kNJFWrpyJxevsby3cShtqLmutUDpo%3D&xsec_source=pc_search" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 transition-colors">
                  小红书
                </a>
              </li>
              <li>
                <a href="https://space.bilibili.com/3706942042147319?spm_id_from=333.33.0.0" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 transition-colors">
                  哔哩哔哩
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 text-sm">支持</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="/legal/privacy" className="hover:text-teal-600 transition-colors">隐私政策</a></li>
              <li><a href="/legal/terms" className="hover:text-teal-600 transition-colors">服务条款</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200/70 flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Echo App. All rights reserved.</p>
          <p className="text-slate-300 italic text-xs">找回节奏，从最小开始</p>
        </div>
      </div>
    </footer>
  );
};

/* ═══════════════════ MAIN PAGE ═══════════════════ */
export default function Home() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState('检查中...');
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const isTransitioning = loading || authStatus.startsWith('已登录');

  const [showSpiritMessage, setShowSpiritMessage] = useState(false);
  const [spiritMessage, setSpiritMessage] = useState('');
  const [spiritClickCount, setSpiritClickCount] = useState(0);
  const hasShownWelcome = useRef(false);
  const spiritMessageTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hasCheckedAuth = useRef(false);
  const isSignedOutSession = useRef(false);
  const scrollDepthReached = useRef<Set<number>>(new Set());

  const showMessage = useCallback((message: string, duration = 5000) => {
    setSpiritMessage(message);
    setShowSpiritMessage(true);
    if (spiritMessageTimerRef.current) {
      clearTimeout(spiritMessageTimerRef.current);
      spiritMessageTimerRef.current = null;
    }
    spiritMessageTimerRef.current = setTimeout(() => {
      setShowSpiritMessage(false);
      spiritMessageTimerRef.current = null;
    }, duration);
  }, []);

  useEffect(() => {
    if (!hasCheckedAuth.current || router.query.signedOut === 'true') {
      hasCheckedAuth.current = true;
      checkAuthAndRedirect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.signedOut]);

  useEffect(() => {
    const DEPTHS = [50, 90];
    const handleScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (total <= 0) return;
      const pct = Math.floor((scrolled / total) * 100);
      for (const depth of DEPTHS) {
        if (pct >= depth && !scrollDepthReached.current.has(depth)) {
          scrollDepthReached.current.add(depth);
          trackEvent({ name: 'landing_scroll_depth', feature: 'landing', page: '/', action: 'scroll', properties: { depth } });
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isTransitioning) {
      setCurrentStepIndex(0);
      return;
    }
    const timers: NodeJS.Timeout[] = [];
    const runStep = (index: number) => {
      if (index >= LOADING_STEPS.length) return;
      const timer = setTimeout(() => {
        setCurrentStepIndex(index + 1);
        runStep(index + 1);
      }, LOADING_STEPS[index]!.duration);
      timers.push(timer);
    };
    runStep(0);
    return () => timers.forEach((t) => clearTimeout(t));
  }, [isTransitioning]);

  useEffect(() => {
    if (!isTransitioning && !hasShownWelcome.current) {
      hasShownWelcome.current = true;
      setTimeout(() => {
        showMessage('嘿，你来了。\n\n从这里开始，你的时间会慢慢有重量。', 5000);
      }, 100);
    }
  }, [isTransitioning, showMessage]);

  const checkAuthAndRedirect = async () => {
    try {
      const isSignedOut = router.query.signedOut === 'true';
      if (isSignedOut) {
        isSignedOutSession.current = true;
        if (typeof window !== 'undefined') window.history.replaceState({}, '', '/');
        setAuthStatus('未登录');
        setLoading(false);
        return;
      }
      if (isSignedOutSession.current) {
        setAuthStatus('未登录');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const session = await response.json();

      if (session?.user) {
        setAuthStatus(`已登录: ${session.user.email}`);
        if (session.user.id) setCurrentUserId(session.user.id);
        handleAuthenticatedUser(session);
      } else {
        setAuthStatus('未登录');
        setLoading(false);
      }
    } catch {
      setAuthStatus('检查失败');
      setLoading(false);
    }
  };

  const handleAuthenticatedUser = (session: any) => {
    if (session?.user?.id) setCurrentUserId(session.user.id);

    setTimeout(() => {
      const firstWelcomeKey = 'firstEchoWelcomeShown';
      const hasShownFirstWelcome = typeof window !== 'undefined' ? localStorage.getItem(firstWelcomeKey) === 'true' : false;

      if (!hasShownFirstWelcome) {
        showMessage('你来了。我在这里等你很久了。\n\n我是 Lumi，你的光精灵。\n\n从现在开始，这里叫 Echo——一个只属于你的安静之地。', 8000);
        if (typeof window !== 'undefined') localStorage.setItem(firstWelcomeKey, 'true');
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
        return;
      }

      router.push('/dashboard');
    }, 300);
  };

  const loadingMessage = currentStepIndex < LOADING_STEPS.length ? LOADING_STEPS[currentStepIndex]!.message : 'Connected. Preparing Echo...';

  const handleSpiritClick = () => {
    const count = spiritClickCount + 1;
    setSpiritClickCount(count);
    if (count === 1) {
      showMessage('我是 Lumi。\n\n从现在起，我会和你一起守住那些真正属于你的时间。\n\n你不是一个人。', 6000);
    } else if (count === 2) {
      showMessage('咳，欢迎仪式到这就够啦。\n\n走吧，让我们开始专注吧。', 5000);
    } else if (count === 3) {
      showMessage('好了，欢迎环节就到这。\n\n剩下的时间，我们拿去专注。', 5000);
    } else {
      const msg = RANDOM_SPIRIT_MESSAGES[Math.floor(Math.random() * RANDOM_SPIRIT_MESSAGES.length)]!;
      showMessage(msg, 4000);
    }
  };

  const handlePrimaryAction = (email?: string, position?: string) => {
    if (position) {
      trackEvent({ name: 'landing_cta_click', feature: 'landing', page: '/', action: 'click', properties: { position } });
    }
    router.push(email ? `/auth/signin?email=${encodeURIComponent(email)}` : '/auth/signin');
  };
  const handleSecondaryAction = () => router.push('/auth/signin');

  /* ─── Loading / Splash screen ─── */
  if (isTransitioning) {
    return <SplashLoader message="准备你的专注空间" />;
  }

  /* ─── Landing page ─── */
  return (
    <>
      <Head>
        <title>Echo - 夺回时间，从心开始</title>
      </Head>
      <div className="min-h-screen bg-[#fafcfb] text-slate-900 relative font-sans">
        <LandingNavbar onPrimaryAction={() => handlePrimaryAction(undefined, 'nav')} onSecondaryAction={handleSecondaryAction} />
        <main>
          <LandingHero onPrimaryAction={() => handlePrimaryAction(undefined, 'hero')} />
          <SocialProof />
          <FeatureGrid />
          <HowItWorks />
          <MotivationSection />
          <InstallSection />
          <LandingCTA onPrimaryAction={handlePrimaryAction} />
        </main>
        <LandingFooter />

        {/* Spirit */}
        <div className="fixed bottom-8 right-8 z-50">
          <EchoSpirit state="idle" onClick={handleSpiritClick} />
        </div>

        {showSpiritMessage && (
          <div className="fixed bottom-48 right-8 z-50 max-w-xs landing-slide-up">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-teal-100/60 relative">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✨</span>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{spiritMessage}</p>
              </div>
              <div className="absolute -bottom-2 right-12 w-4 h-4 bg-white/95 border-r border-b border-teal-100/60 rotate-45" />
            </div>
          </div>
        )}

        <style jsx>{`
          /* ── Scroll reveal system ── */
          :global(.reveal-hidden) { opacity: 0; }
          :global(.reveal-visible) { opacity: 1; transform: none !important; transition: opacity 0.7s cubic-bezier(0.34,1.56,0.64,1), transform 0.7s cubic-bezier(0.34,1.56,0.64,1); }
          :global(.reveal-fadeUp.reveal-hidden)    { transform: translateY(32px); }
          :global(.reveal-fadeIn.reveal-hidden)    { transform: none; }
          :global(.reveal-scaleIn.reveal-hidden)   { transform: scale(0.92); }
          :global(.reveal-fadeLeft.reveal-hidden)  { transform: translateX(-32px); }
          :global(.reveal-fadeRight.reveal-hidden) { transform: translateX(32px); }

          /* ── Floating orbs ── */
          @keyframes orb-float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(20px, -30px) scale(1.05); }
          }
          @keyframes orb-float-reverse {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-20px, 25px) scale(1.03); }
          }
          :global(.landing-orb-float)         { animation: orb-float 18s ease-in-out infinite; }
          :global(.landing-orb-float-reverse)  { animation: orb-float-reverse 22s ease-in-out infinite; }

          /* ── Radial gradient helper ── */
          :global(.bg-gradient-radial) {
            background: radial-gradient(circle, var(--tw-gradient-stops));
          }

          /* ── Mobile menu enter ── */
          @keyframes menu-enter {
            from { opacity: 0; transform: translateY(-8px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          :global(.landing-menu-enter) { animation: menu-enter 0.25s cubic-bezier(0.34,1.56,0.64,1); }

          /* ── Spirit message slide up ── */
          @keyframes slide-up {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          :global(.landing-slide-up) { animation: slide-up 0.3s ease-out; }
        `}</style>
      </div>
    </>
  );
}
