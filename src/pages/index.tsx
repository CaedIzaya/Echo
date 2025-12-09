'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import ProgressRing from './dashboard/ProgressRing';
import EchoSpirit from './dashboard/EchoSpirit';

const FOCUS_QUOTES = [
  { text: 'Attention is the rarest and purest form of generosity.', author: 'Simone Weil' },
  { text: 'Silence is not the absence of something but the presence of everything.', author: 'Gordon Hempton' },
  { text: 'The art of being wise is the art of knowing what to overlook.', author: 'William James' },
  { text: 'You become what you give your attention to.', author: 'Epictetus' },
  { text: 'Distraction is the destroyer of depth.', author: 'Digital Minimalism' },
];

const LOADING_STEPS = [
  { id: 1, message: 'Disconnecting from the noise...', duration: 1600 },
  { id: 2, message: 'Filtering stray algorithms...', duration: 1200 },
  { id: 3, message: 'Syncing with your intention...', duration: 1500 },
  { id: 4, message: 'Reclaiming your focus...', duration: 1000 },
  { id: 5, message: 'Echo is almost ready.', duration: 800 },
];

const LANDING_FEATURES = [
  {
    title: '轻量规划',
    description: '找到自己的热爱，并随时随地完成小目标',
    icon: '🎯',
    accent: 'from-emerald-50 via-white to-teal-50/60 border-emerald-100/70',
  },
  {
    title: '专注计时',
    description: '允许你划水，但是专注的时候，全力以赴',
    icon: '⏱️',
    accent: 'from-cyan-50 via-white to-sky-50/60 border-cyan-100/70',
  },
  {
    title: '陪伴守护',
    description: '与光精灵和心树一起，见证每一刻成长的确幸',
    icon: '😃',
    accent: 'from-teal-50 via-white to-emerald-50/60 border-teal-100/70',
  },
] as const;

const HERO_PLAN_TASKS = [
  { title: '晨间写作', detail: '完成 500 字手稿', done: true },
  { title: '章节复盘', detail: '记录 3 条灵感', done: false },
  { title: '夜读沉浸', detail: '专注 25 分钟', done: false },
];

const EchoLoader = () => {
  const rings = [0, 1, 2, 3];
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full border border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.25)] backdrop-blur-md">
        <div className="w-8 h-8 rounded-full border border-emerald-400/70 border-dashed animate-spin-slow" />
      </div>
      {rings.map((ring) => (
        <span
          key={ring}
          className="absolute rounded-full border border-emerald-400/30 animate-echo-ring"
          style={{ animationDelay: `${ring * 0.8}s` }}
        />
      ))}
      <div className="absolute inset-0 rounded-full blur-3xl bg-emerald-500/20" />
    </div>
  );
};

const QuoteRotator = ({ quotes }: { quotes: typeof FOCUS_QUOTES }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let fadeTimeout: NodeJS.Timeout | null = null;
    const interval = setInterval(() => {
      setVisible(false);
      fadeTimeout = setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % quotes.length);
        setVisible(true);
      }, 400);
    }, 3600);

    return () => {
      clearInterval(interval);
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
      }
    };
  }, [quotes.length]);

  const currentQuote = quotes[quoteIndex];

  return (
    <div
      className={`text-center transition-opacity duration-500 ease-in-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <p className="text-lg md:text-xl text-emerald-100/90 font-light italic leading-relaxed">
        “{currentQuote.text}”
      </p>
      <p className="mt-4 text-xs tracking-[0.35em] uppercase text-zinc-500 font-medium">
        — {currentQuote.author}
      </p>
    </div>
  );
};

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
      return () => {
        document.body.style.overflow = '';
      };
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
            <p className="text-xl font-bold text-slate-900">数字静默</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-teal-600 transition-colors">
            功能
          </a>
          <a href="#mission" className="hover:text-teal-600 transition-colors">
            理念
          </a>
          <button
            onClick={onSecondaryAction}
            className="px-5 py-2 rounded-full text-teal-600 font-semibold hover:bg-teal-50 transition-colors"
          >
            登录
          </button>
          <button
            onClick={onPrimaryAction}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold transition-all shadow-lg hover:shadow-emerald-400/40"
          >
            免费注册
          </button>
        </div>

        <button
          className="md:hidden text-slate-600"
          aria-label="切换菜单"
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            {isMenuOpen ? (
              <path
                d="M6 6l12 12M6 18L18 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
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
        <div className="md:hidden bg-white shadow-lg border-t border-slate-100 mx-4 mt-4 rounded-2xl p-5 space-y-4">
          <a href="#features" className="block text-base font-medium text-slate-700">
            功能
          </a>
          <a href="#mission" className="block text-base font-medium text-slate-700">
            理念
          </a>
          <button
            onClick={onSecondaryAction}
            className="w-full py-3 rounded-xl bg-teal-50 text-teal-600 font-semibold"
          >
            登录
          </button>
          <button
            onClick={onPrimaryAction}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold shadow-md"
          >
            免费注册
          </button>
        </div>
      )}
    </nav>
  );
};

const LandingHero = ({
  onPrimaryAction,
  onSecondaryAction,
}: {
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) => {
  return (
    <section className="relative min-h-screen pt-32 md:pt-48 pb-8 overflow-hidden" id="mission">
      <div className="absolute top-20 right-0 -z-10 w-[720px] h-[720px] bg-gradient-to-br from-emerald-100/70 via-cyan-100/60 to-sky-100/40 rounded-full blur-3xl opacity-70 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 -z-10 w-[520px] h-[520px] bg-gradient-to-br from-cyan-100/70 via-teal-100/60 to-emerald-100/40 rounded-full blur-3xl opacity-70 -translate-x-1/4" />

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-teal-100 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500" />
            </span>
            <span className="text-sm font-medium text-teal-700">Echo · 数字静默</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight">
          在这里,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400">
            重遇自我
            </span>
          </h1>

          <div className="space-y-4 text-lg md:text-xl text-slate-600 leading-relaxed">
            <p>在这个时代，你的注意力就是最后的领地。</p>
            <p>Echo 会陪你一点点，重建你的节奏与清醒。</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={onPrimaryAction}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-400 rounded-full shadow-[0_20px_45px_-25px_rgba(14,165,233,0.7)] hover:shadow-[0_30px_60px_-30px_rgba(14,165,233,0.9)] transition-all hover:-translate-y-1"
            >
              开始使用
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

          <div className="relative hidden md:flex items-center justify-center">
              <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-emerald-50 p-6 z-10 transform rotate-2 hover:rotate-0 transition-transform duration-500 scale-90">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">投资自己</h3>
                <p className="text-sm text-slate-500">按节奏投入热爱的事</p>
              </div>
              <div className="px-3 py-1 bg-teal-50 text-teal-500 text-xs font-semibold rounded-full">
                正在进行
              </div>
            </div>

                <div className="flex items-center gap-6">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <ProgressRing progress={0.72} color="#0ea5e9" size={144} strokeWidth={12} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-900">72%</span>
                  <span className="text-xs text-slate-500">今日完成度</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
                  <p className="text-xs text-emerald-500">  本周心流</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">12h 40m</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-50 to-white border border-cyan-100">
                  <p className="text-xs text-cyan-500">今日目标</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">25 分钟</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-50 to-white border border-sky-100">
                  <p className="text-xs text-sky-500">心流指数</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">75</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-50 to-white border border-teal-100">
                  <p className="text-xs text-teal-500">当前连胜</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">3 天</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {HERO_PLAN_TASKS.map((task) => (
                <div
                  key={task.title}
                  className={`flex items-center gap-3 p-3 rounded-2xl border ${
                    task.done ? 'border-emerald-100 bg-emerald-50/60' : 'border-cyan-50 bg-white'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                      task.done ? 'bg-emerald-500 shadow-[0_8px_15px_-10px_rgba(16,185,129,0.6)]' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {task.done ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="block w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${task.done ? 'text-slate-900 line-through decoration-emerald-500' : 'text-slate-800'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-500">{task.detail}</p>
                  </div>
                  {task.done && (
                    <span className="text-xs text-emerald-600 font-semibold px-2 py-1 rounded-full bg-emerald-100">已完成</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            className="absolute -right-6 top-10 bg-gradient-to-br from-emerald-400 to-cyan-400 text-white p-4 rounded-2xl shadow-xl border border-emerald-100/30 animate-bounce"
            style={{ animationDuration: '3s' }}
          >
            <span className="text-2xl">⏱️</span>
            <span className="ml-2 font-mono font-bold">25:00</span>
          </div>

          <div
            className="absolute -left-8 bottom-16 bg-white/95 p-4 rounded-2xl shadow-xl border border-teal-50 animate-pulse"
            style={{ animationDuration: '4s' }}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-teal-700">深度专注模式</span>
            </div>
          </div>
        </div>
      </div>

      {/* 新增：你是否？.. 模块移入 Hero Section */}
      <div className="max-w-7xl mx-auto px-6 mt-4 pb-12">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900/80 mb-2 tracking-widest">
            你是否？..
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* 卡片 1 */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm">
            <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <p className="text-base font-light leading-relaxed text-slate-700">
              意识到自己的注意力常被无形牵引？
            </p>
          </div>

          {/* 卡片 2 */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm">
            <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <p className="text-base font-light leading-relaxed text-slate-700">
              想把精力花在真正值得的人与事上？
            </p>
          </div>

          {/* 卡片 3 */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm">
            <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <p className="text-base font-light leading-relaxed text-slate-700">
              渴望重新掌握自己的节奏与生活？
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


const FeatureGrid = () => (
  <section id="features" className="pt-8 pb-24 bg-white">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-teal-600 font-semibold tracking-wider uppercase text-sm bg-teal-50 px-4 py-1 rounded-full">
          核心功能
        </span>
        <h2 className="mt-6 text-4xl font-bold text-slate-900">夺回你的注意力</h2>
        <p className="mt-4 text-lg text-slate-500">
          Echo 是你的注意力伙伴，它是你在嘈杂数字世界里的静谧避难所。
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {LANDING_FEATURES.map((feature) => (
          <div
            key={feature.title}
            className={`group relative p-8 rounded-[2rem] border ${feature.accent} shadow-lg hover:shadow-emerald-100/80 transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br`}
          >
            <div className="text-5xl mb-4 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
              {feature.icon}
            </div>
            <h3 className="font-bold text-slate-900 mb-3 text-xl">{feature.title}</h3>
            <p className="text-slate-600 leading-relaxed">{feature.description}</p>
            <div className="absolute bottom-4 left-8 right-8 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

const LandingCTA = ({ onPrimaryAction }: { onPrimaryAction: (email?: string) => void }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      // 如果有邮箱，跳转到登录页并传递邮箱参数
      onPrimaryAction(email.trim());
    } else {
      // 如果没有邮箱，直接跳转
      onPrimaryAction();
    }
  };

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-br from-[#022b2f] via-[#044345] to-[#056060]">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
      <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-[140px] opacity-30" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-400 rounded-full blur-[200px] opacity-30" />

      <div className="relative max-w-4xl mx-auto px-6 text-center text-white">
        <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">
          准备好开始这段
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-emerald-200 to-cyan-100">
            专注之旅了吗？
          </span>
        </h2>
        <p className="text-xl text-emerald-100/80 mb-10">
          在无序的噪音里选择 Echo，选择倾听内心的声音。免费注册，即刻开启。
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="输入你的邮箱地址..."
            className="w-full sm:w-80 px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder-emerald-200 focus:outline-none focus:ring-2 focus:ring-teal-300 backdrop-blur-sm transition-all"
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 text-slate-900 font-bold rounded-full hover:shadow-[0_25px_50px_-25px_rgba(16,185,129,0.8)] transition-all transform hover:-translate-y-1"
          >
            即刻开始
          </button>
        </form>
        <p className="mt-6 text-sm text-emerald-100/60"></p>
      </div>
    </section>
  );
};

const LandingFooter = () => (
  <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-gradient-to-br from-teal-500 to-cyan-500 text-white p-1.5 rounded-xl flex items-center justify-center overflow-hidden w-10 h-10">
              <img src="/Echo Icon.png" alt="Echo" className="w-full h-full object-cover scale-150" />
            </div>
            <span className="text-xl font-bold text-slate-900">Echo</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">
            我们致力于帮你找回被碎片化信息夺走的专注力，重新建立深度思考的能力。
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-3">产品</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              <a href="#" className="hover:text-teal-600 transition-colors">
                功能介绍
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-teal-600 transition-colors">
                更新日志
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-teal-600 transition-colors">
                
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-3">资源</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              <a href="#" className="hover:text-teal-600 transition-colors">
                专注力指南
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-teal-600 transition-colors">
                社区博客
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-teal-600 transition-colors">
                帮助中心
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-3">关注我们</h4>
          <div className="flex gap-4">
            {['T', 'G', 'I'].map((icon) => (
              <a
                key={icon}
                href="#"
                className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-all"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-slate-400">
        <p>© {new Date().getFullYear()} Echo App. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-600">
            隐私政策
          </a>
          <a href="#" className="hover:text-slate-600">
            服务条款
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default function Home() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState('检查中...');
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const isTransitioning = loading || authStatus.startsWith('已登录');
  
  // 小精灵相关状态
  const [showSpiritMessage, setShowSpiritMessage] = useState(false);
  const [spiritMessage, setSpiritMessage] = useState('');
  const [spiritClickCount, setSpiritClickCount] = useState(0);
  const hasShownWelcome = useRef(false);
  
  // 随机消息
  const randomMessages = [
    "……你真喜欢点我。",
    "再点我我就假装死机了。",
    "？？？ 你是来玩 Echo 的，还是来玩我的？"
  ];

  const shouldForceOnboarding = () => {
    if (typeof window === 'undefined') {
      return false;
    }
    return sessionStorage.getItem('forceOnboarding') === 'true';
  };

  const markOnboardingCompleteSilently = async () => {
    try {
      await fetch('/api/user/complete-onboarding', {
        method: 'POST',
      });
    } catch (error) {
      console.error('首页自动更新 onboarding 状态失败:', error);
    }
  };

  // 显示小精灵消息
  const showMessage = (message: string, duration: number = 5000) => {
    setSpiritMessage(message);
    setShowSpiritMessage(true);
    setTimeout(() => {
      setShowSpiritMessage(false);
    }, duration);
  };

  useEffect(() => {
    checkAuthAndRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.signedOut]);

  useEffect(() => {
    if (!isTransitioning) {
      setCurrentStepIndex(0);
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    const runStep = (index: number) => {
      if (index >= LOADING_STEPS.length) {
        return;
      }
      const timer = setTimeout(() => {
        setCurrentStepIndex(index + 1);
        runStep(index + 1);
      }, LOADING_STEPS[index].duration);
      timers.push(timer);
    };

    runStep(0);

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [isTransitioning]);

  // 自动显示开场白
  useEffect(() => {
    if (!isTransitioning && !hasShownWelcome.current) {
      hasShownWelcome.current = true;
      setTimeout(() => {
        setSpiritMessage("嘿，你来了。\n\n从这里开始，你的时间会慢慢有重量。");
        setShowSpiritMessage(true);
        setTimeout(() => {
          setShowSpiritMessage(false);
        }, 5000);
      }, 500); // 延迟500ms显示，确保页面已加载
    }
  }, [isTransitioning]);

  const checkAuthAndRedirect = async () => {
    try {
      // 检查是否是退出登录后的重定向（通过 URL 参数）
      const isSignedOut = router.query.signedOut === 'true';
      
      if (isSignedOut) {
        // 清除 URL 参数，避免刷新后再次触发（使用 replace 不会触发页面重新加载）
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/');
        }
        
        // 强制清除可能的缓存，重新获取 session
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        const session = await response.json();
        
        console.log("首页：退出登录后检查 session:", session);
        
        // 如果 session 仍然存在（可能是缓存），等待一下再检查
        if (session?.user) {
          console.log("首页：退出登录后仍检测到 session，等待清除...");
          // 等待服务器清除 session
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 再次检查 session
          const retryResponse = await fetch('/api/auth/session', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
          const retrySession = await retryResponse.json();
          
          if (retrySession?.user) {
            console.log("首页：重试后仍有 session，可能是真的登录了");
            setAuthStatus(`已登录: ${retrySession.user.email}`);
            handleAuthenticatedUser(retrySession);
            return;
          }
        }
        
        // 确认用户已退出登录，显示欢迎页面
        setAuthStatus('未登录');
        console.log("首页：确认用户已退出登录，显示欢迎界面");
        setLoading(false);
        return;
      }
      
      console.log("首页：开始检查认证状态...");
      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const session = await response.json();
      
      console.log("首页：获取到的 session:", session);
      
      if (session?.user) {
        setAuthStatus(`已登录: ${session.user.email}`);
        console.log("首页：用户已登录，检查 onboarding 状态:", session.user.hasCompletedOnboarding);
        handleAuthenticatedUser(session);
      } else {
        setAuthStatus('未登录');
        console.log("首页：用户未登录，显示欢迎界面");
        // 不再自动跳转，显示欢迎界面
        setLoading(false);
      }
    } catch (error) {
      console.error("首页：检查认证状态失败:", error);
      setAuthStatus('检查失败');
      
      // 出错时显示欢迎界面
      setLoading(false);
    } finally {
      // 注意：这里不再统一设置 loading，因为不同分支有自己的处理
    }
  };

  const handleAuthenticatedUser = (session: any) => {
    // 短暂延迟让用户看到状态
    setTimeout(() => {
      const forceOnboarding = shouldForceOnboarding();
      console.log('首页：是否需要强制引导流程:', forceOnboarding);

      if (forceOnboarding) {
        router.push('/onboarding');
        return;
      }

      if (session.user.hasCompletedOnboarding) {
        router.push('/dashboard');
        return;
      }

      markOnboardingCompleteSilently()
        .catch(() => {
          // 已记录日志，忽略错误
        })
        .finally(() => {
          router.push('/dashboard');
        });
    }, 1000);
  };

  const loadingMessage =
    currentStepIndex < LOADING_STEPS.length
      ? LOADING_STEPS[currentStepIndex].message
      : 'Connected. Preparing Echo...';

  // 处理小精灵点击
  const handleSpiritClick = () => {
    const count = spiritClickCount + 1;
    setSpiritClickCount(count);

    if (count === 1) {
      showMessage("我是 Lumi。\n\n从现在起，我会和你一起守住那些真正属于你的时间。\n\n你不是一个人。", 6000);
    } else if (count === 2) {
      showMessage("咳，欢迎仪式到这就够啦。\n\n走吧，让我们开始专注吧。", 5000);
    } else if (count === 3) {
      showMessage("好了，欢迎环节就到这。\n\n剩下的时间，我们拿去专注。", 5000);
    } else {
      // 随机显示消息
      const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)];
      showMessage(randomMessage, 4000);
    }
  };

  const handlePrimaryAction = (email?: string) => {
    if (email) {
      // 如果有邮箱，跳转到登录页并传递邮箱参数
      router.push(`/auth/signin?email=${encodeURIComponent(email)}`);
    } else {
      // 如果没有邮箱，直接跳转
      router.push('/auth/signin');
    }
  };
  const handleSecondaryAction = () => router.push('/auth/signin');

  // 早期返回：loading状态时显示加载界面（必须在所有hooks之后）
  if (isTransitioning) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-500 text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="relative z-10 flex flex-col items-center gap-10 px-6 text-center">
          <p className="text-xs tracking-[0.4em] uppercase text-white/70">Echo Focus</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">专注准备中...</h1>
          <div className="flex items-end justify-center gap-3 h-10">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="w-4 h-4 rounded-full bg-white/90 animate-dot-bounce"
                style={{ animationDelay: `${dot * 0.2}s` }}
              />
            ))}
          </div>
          <p className="text-sm tracking-[0.3em] uppercase text-white/70">
            {loadingMessage}
          </p>
        </div>

        <style jsx>{`
          @keyframes dot-bounce {
            0%,
            60%,
            100% {
              transform: translateY(0);
            }
            30% {
              transform: translateY(-10px);
            }
          }
          .animate-dot-bounce {
            animation: dot-bounce 1.2s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // 未登录时显示欢迎界面
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative font-sans">
      <LandingNavbar onPrimaryAction={handlePrimaryAction} onSecondaryAction={handleSecondaryAction} />
      <main>
        <LandingHero
          onPrimaryAction={handlePrimaryAction}
          onSecondaryAction={handleSecondaryAction}
        />
        <FeatureGrid />
        <LandingCTA onPrimaryAction={handlePrimaryAction} />
      </main>
      <LandingFooter />
      
      {/* 小精灵 */}
      {!isTransitioning && (
        <div className="fixed bottom-8 right-8 z-50">
          <EchoSpirit
            state="idle"
            onClick={handleSpiritClick}
          />
        </div>
      )}
      
      {/* 小精灵消息气泡 - 位于小精灵上方 */}
      {showSpiritMessage && (
        <div className="fixed bottom-48 right-8 z-50 max-w-xs animate-slide-up">
          <div className="bg-white rounded-2xl p-4 shadow-2xl border border-teal-100 relative">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✨</span>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {spiritMessage}
              </p>
            </div>
            {/* 气泡小三角 - 指向下方的小精灵 */}
            <div className="absolute -bottom-2 right-12 w-4 h-4 bg-white border-r border-b border-teal-100 transform rotate-45"></div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}